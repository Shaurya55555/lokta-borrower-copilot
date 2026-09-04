import {
  AFFORDABILITY,
  DEFAULTS,
  FOIR_BANDS,
  FOIR_INFORMAL_CAP,
  FOIR_SECURED_BONUS,
  NON_PRODUCTIVE_PURPOSES,
  PRODUCTS,
  type ProductId,
} from './config';
import { maxPrincipalForEmi, roundTo } from './finance';
import { ROUND } from './config';
import type { Answers, Obligations } from './types';

const inrRaw = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
/** Loan-principal-scale figure, rounded to the nearest ₹1,000 - matches the
 *  precision the app's own confidence bands actually support. */
const inr = (n: number) => inrRaw(roundTo(n, ROUND.principal));
/** Monthly-figure-scale (EMI, income, deductions) number, nearest ₹100. */
const inrM = (n: number) => inrRaw(roundTo(n, ROUND.emi));

export interface Ceiling {
  maxNewEmi: number;
  maxPrincipal: number;
  tenureMonths: number;
  bindingReason: string;
  /** Step-by-step trace from income to the final EMI ceiling - populated by
   *  borrowerCeiling() only. The brief asks for one-sentence traceability
   *  (bindingReason already gives that); this is the same numbers broken into
   *  rows for a borrower who wants to see, not just read, where a figure
   *  came from. Nothing here is new data - it was already computed and
   *  discarded before this field existed. */
  trace?: { label: string; amount: number; kind: 'start' | 'deduction' | 'cap' | 'result' }[];
}

/** §3 - what a lender will likely sanction. Optimistic end: max tenure, mid rate. */
export function lenderCeiling(
  a: Answers,
  ami: number,
  obligations: Obligations,
  productId: ProductId,
  expectedRatePct: number,
  collateralCeiling?: number,
): Ceiling {
  const p = PRODUCTS[productId];
  let ceiling = FOIR_BANDS.find((b) => ami <= b.upTo)!.ceiling;
  const parts: string[] = [`FOIR ceiling ${Math.round(ceiling * 100)}% for income ${inrM(ami)}`];

  if (p.secured) {
    ceiling += FOIR_SECURED_BONUS;
    parts.push(`+${Math.round(FOIR_SECURED_BONUS * 100)}% because the loan is secured`);
  }
  if (a.incomeType === 'informal') {
    ceiling = Math.min(ceiling, FOIR_INFORMAL_CAP);
    parts.push(`hard-capped at ${Math.round(FOIR_INFORMAL_CAP * 100)}% for informal income`);
  }

  const maxNewEmi = Math.max(0, ceiling * ami - obligations.total);
  const tenureMonths = p.tenureMonths[1];
  let maxPrincipal = maxPrincipalForEmi(maxNewEmi, expectedRatePct, tenureMonths);

  let bindingReason = `A lender stops at ${parts.join(', ')}: ${Math.round(
    ceiling * 100,
  )}% of ${inrM(ami)} minus ${inrM(obligations.total)} already committed leaves ${inrM(
    maxNewEmi,
  )}/month, which is about ${inr(maxPrincipal)} over ${tenureMonths / 12} years. This is our FOIR-style estimate of lender-side capacity, not a specific lender's approval or a guarantee.`;

  if (collateralCeiling !== undefined && collateralCeiling < maxPrincipal) {
    maxPrincipal = collateralCeiling;
    bindingReason = `Your collateral caps this at ${inr(
      collateralCeiling,
    )} (loan-to-value limit) - that bites before your income does.`;
  }

  return { maxNewEmi, maxPrincipal, tenureMonths, bindingReason };
}

/** §4 - what the borrower can safely carry. Stricter test, prudent tenure. */
export function borrowerCeiling(
  a: Answers,
  ami: number,
  obligations: Obligations,
  productId: ProductId,
  expectedRatePct: number,
): Ceiling {
  const p = PRODUCTS[productId];
  const deductions: { label: string; amount: number }[] = [];

  deductions.push({ label: 'Already committed each month', amount: obligations.total });

  // Rent - only if renting and the loan is not for a home to move into
  const movingIntoHome = a.purpose === 'home_purchase';
  if ((a.rentPaid ?? 0) > 0 && !movingIntoHome) {
    deductions.push({ label: 'Rent', amount: a.rentPaid! });
  }

  // Household / living expenses, floored at subsistence
  const dependents = a.dependents ?? 0;
  const subsistence = AFFORDABILITY.subsistenceBase + AFFORDABILITY.subsistencePerDependent * dependents;
  const household = Math.max(a.monthlyHouseholdExpenses ?? 0, subsistence);
  deductions.push({
    label:
      (a.monthlyHouseholdExpenses ?? 0) >= subsistence
        ? 'Household expenses (as stated)'
        : `Household expenses (floored at subsistence for ${dependents} dependents)`,
    amount: household,
  });

  // Emergency-savings contribution, unless already well-buffered
  const savingsMonths = a.emergencySavingsMonths ?? DEFAULTS.emergencySavingsMonths;
  if (savingsMonths < AFFORDABILITY.emergencySavingsWaiverMonths) {
    deductions.push({
      label: 'Protected monthly savings (thin emergency buffer)',
      amount: ami * AFFORDABILITY.emergencySavingsRate,
    });
  }

  // Income-volatility buffer
  const bufferRate = AFFORDABILITY.volatilityBuffer[a.incomeType ?? 'informal'];
  if (bufferRate > 0) {
    deductions.push({ label: 'Income-volatility cushion', amount: ami * bufferRate });
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  let safeEmi = Math.max(0, ami - totalDeductions);

  // Consumption-loan prudence cap
  const nonProductive =
    NON_PRODUCTIVE_PURPOSES.includes(a.purpose ?? '') || (a.purpose && !a.loanIsProductive && !['home_purchase', 'education'].includes(a.purpose));
  let capNote = '';
  if (nonProductive) {
    const cap = (a.netMonthlyIncome ?? ami) * AFFORDABILITY.consumptionEmiCapOfIncome;
    if (cap < safeEmi) {
      capNote = ` A discretionary purpose is additionally capped at ${Math.round(
        AFFORDABILITY.consumptionEmiCapOfIncome * 100,
      )}% of take-home (${inrM(cap)}) - our own borrower-protection guardrail, not a lender rule - which is the tighter limit here.`;
      safeEmi = cap;
    }
  }

  const tenureMonths = p.tenureMonths[0]; // prudent default
  const maxPrincipal = maxPrincipalForEmi(safeEmi, expectedRatePct, tenureMonths);

  const bindingReason =
    `After ${inrM(totalDeductions)} of unavoidable monthly outgo, ${inrM(ami)} income leaves ${inrM(
      safeEmi,
    )} for a new EMI.${capNote} Over a sensible ${tenureMonths / 12}-year term that is about ${inr(
      maxPrincipal,
    )}.`;

  const trace: Ceiling['trace'] = [
    { label: 'Assessed monthly income', amount: ami, kind: 'start' },
    ...deductions.map((d) => ({ label: d.label, amount: -d.amount, kind: 'deduction' as const })),
  ];
  if (capNote) {
    const capAmount = (a.netMonthlyIncome ?? ami) * AFFORDABILITY.consumptionEmiCapOfIncome;
    trace.push({
      label: `Discretionary-loan cap (${Math.round(AFFORDABILITY.consumptionEmiCapOfIncome * 100)}% of take-home)`,
      amount: capAmount,
      kind: 'cap',
    });
  }
  trace.push({ label: 'Safe new EMI', amount: safeEmi, kind: 'result' });

  return { maxNewEmi: safeEmi, maxPrincipal, tenureMonths, bindingReason, trace };
}
