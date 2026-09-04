import { DEFAULTS, PRODUCTS, ROUND, VERDICT, type ProductId } from './config';
import { roundTo } from './finance';
import type { Answers, Obligations, StressCase, Verdict } from './types';
import type { Ceiling } from './ceilings';

const inrRaw = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
/** A loan-principal-scale figure, rounded to the nearest ₹1,000 - the model's
 *  own confidence bands move in double digits of percent, so stating a
 *  six-figure amount to the nearest rupee is a false precision the app
 *  doesn't actually have. */
const inr = (n: number) => inrRaw(roundTo(n, ROUND.principal));
/** A monthly-figure-scale (EMI, income) number, rounded to the nearest ₹100. */
const inrM = (n: number) => inrRaw(roundTo(n, ROUND.emi));

export interface VerdictResult {
  call: Verdict;
  headline: string;
  why: string;
  constructivePath?: string[];
  /** amount the borrower should actually take (drives O2/O4) */
  recommendedAmount: number;
}

/**
 * §8 - Borrow / Borrow less / Don't borrow. "Don't" must be reachable.
 */
export function decideVerdict(
  a: Answers,
  ami: number,
  obligations: Obligations,
  lender: Ceiling,
  borrower: Ceiling,
  productId: ProductId,
  stress: StressCase[],
): VerdictResult {
  const requested = a.amountWanted ?? 0;
  const secured = PRODUCTS[productId].secured;
  const safePrincipal = Math.min(lender.maxPrincipal, borrower.maxPrincipal);
  const savingsMonths = a.emergencySavingsMonths ?? DEFAULTS.emergencySavingsMonths;
  const existingFoir = ami > 0 ? obligations.total / ami : 1;
  const stressBreaks = stress.some((s) => s.outcome === 'breaks');

  // ── §8.1  DO NOT BORROW ────────────────────────────────────────────
  const dnb: string[] = [];
  if (borrower.maxNewEmi <= 0)
    dnb.push(
      `After rent, essentials and what you already owe, there is nothing left for a new EMI - ${inrM(
        ami,
      )} of income is fully spoken for.`,
    );
  if (a.bounceWithin3m && existingFoir > VERDICT.freshBounceFoir)
    dnb.push(
      `You bounced a payment in the last ${VERDICT.freshBounceMonths} months and ${Math.round(
        existingFoir * 100,
      )}% of your income already goes to debt. A new loan makes the next bounce more likely, not less.`,
    );
  if ((obligations.highCostDebt ?? 0) > VERDICT.expensiveDebtIncomeMultiple * ami && !secured)
    dnb.push(
      `You owe ${inr(
        obligations.highCostDebt,
      )} on loans charging over 28% - more than a month's income. Adding another unsecured loan on top deepens the hole. Clear or refinance that first.`,
    );
  if (stressBreaks && !secured)
    dnb.push(`A 20% income dip or a 2-point rate rise pushes you past what you can pay. There is no shock absorber left.`);
  if (
    !secured &&
    stress[0] &&
    stress[0].foir > VERDICT.thinBufferFoir &&
    savingsMonths < VERDICT.thinBufferSavingsMonths
  )
    dnb.push(
      `This is an unsecured loan that would take over ${Math.round(
        VERDICT.thinBufferFoir * 100,
      )}% of your income under stress, and you have under a month of savings. That is the classic over-leverage pattern.`,
    );

  if (dnb.length > 0) {
    return {
      call: 'do_not_borrow',
      headline: 'Don’t borrow this - not now, and not like this.',
      why: dnb[0],
      constructivePath: buildConstructivePath(a, ami, obligations, borrower, secured),
      recommendedAmount: 0,
    };
  }

  // ── §8.2  BORROW LESS ──────────────────────────────────────────────
  if (requested > safePrincipal * (1 + VERDICT.borrowLessOvershoot)) {
    const binding =
      borrower.maxPrincipal < lender.maxPrincipal
        ? `what you can safely carry (${inr(borrower.maxPrincipal)})`
        : `what a lender will sanction (${inr(lender.maxPrincipal)})`;
    return {
      call: 'borrow_less',
      headline: `Borrow about ${inr(safePrincipal)}, not ${inr(requested)}.`,
      why: `Your ask is above ${binding}. ${
        borrower.maxPrincipal < lender.maxPrincipal ? borrower.bindingReason : lender.bindingReason
      }`,
      recommendedAmount: safePrincipal,
    };
  }
  if (savingsMonths < VERDICT.borrowLessSavingsMonths && !secured) {
    const trimmed = Math.min(requested, borrower.maxPrincipal * 0.75);
    if (trimmed < requested * 0.95) {
      return {
        call: 'borrow_less',
        headline: `Take about ${inr(trimmed)} and build a buffer first.`,
        why: `The numbers allow ${inr(
          requested,
        )}, but you hold under two months of expenses in savings. Borrow smaller, keep the EMI light, and top up your emergency fund before you stretch.`,
        recommendedAmount: trimmed,
      };
    }
  }

  // ── §8.3  BORROW (as requested) ────────────────────────────────────
  const cheaperAlt =
    !secured && (a.collateralValue ?? 0) > 0 && !a.collateralEncumbered
      ? ' A secured loan against your property would cost noticeably less for the same amount - worth asking for even though this is approved.'
      : '';
  return {
    call: 'borrow',
    headline: `You can borrow ${inr(requested)} - it fits both tests.`,
    why: `${inr(requested)} is within both what a lender will sanction (${inr(
      lender.maxPrincipal,
    )}) and what you can safely carry (${inr(borrower.maxPrincipal)}), and it survives the stress cases.${cheaperAlt}`,
    recommendedAmount: requested,
  };
}

function buildConstructivePath(
  a: Answers,
  _ami: number,
  obligations: Obligations,
  borrower: Ceiling,
  secured: boolean,
): string[] {
  const path: string[] = [];
  if ((obligations.highCostDebt ?? 0) > 0) {
    path.push(
      `Replace the ${inr(
        obligations.highCostDebt,
      )} of 28%+ debt with a gold loan or a bank consolidation loan at 14–18% - that alone frees up cash every month.`,
    );
  }
  if (a.bounceWithin3m) path.push('Clear the bounced payment and keep three clean months before applying anywhere.');
  if (!secured && (a.collateralValue ?? 0) > 0) {
    path.push('If you can pledge an asset, a secured loan changes every number in this report - re-run with it.');
  }
  if (borrower.maxNewEmi > 0) {
    path.push(
      `The most you could responsibly service is about ${inrM(
        borrower.maxNewEmi,
      )}/month - roughly ${inr(borrower.maxPrincipal)}. Treat that as a hard ceiling, not a target.`,
    );
  } else {
    path.push('Add a co-applicant with steady income, or wait until your own income steadies, then re-check.');
  }
  path.push('Re-run this in 3 months. The answer changes when the inputs do.');
  return path;
}
