import { CONFIDENCE, PRODUCTS, ROUND, type ProductId } from './config';
import { emi, roundTo, totalInterest } from './finance';
import { assessIncome } from './income';
import { computeObligations } from './obligations';
import { routeProduct, productLabel } from './routing';
import { assessRate } from './rate';
import { borrowerCeiling, lenderCeiling } from './ceilings';
import { stressCases } from './stress';
import { decideVerdict } from './verdict';
import type { Answers, Assessment, Confidence, Obligations, Range } from './types';

const inrRaw = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
/** Loan-principal-scale figure (amounts, total interest), rounded to the
 *  nearest ₹1,000 - matches the precision the model's own confidence bands
 *  actually support. Idempotent, so it's safe on values already rounded
 *  upstream. */
const inr = (n: number) => inrRaw(roundTo(n, ROUND.principal));
/** Monthly-figure-scale (EMI, income, a monthly return), nearest ₹100. */
const inrM = (n: number) => inrRaw(roundTo(n, ROUND.emi));
const inrShort = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
  return inr(n);
};
const pct = (n: number) => n.toFixed(1) + '%';

/** Additional questions that are relevant given the borrower's situation. */
function relevantAdditional(a: Answers): (keyof Answers)[] {
  const base: (keyof Answers)[] = [
    'yearsInJobOrTrade',
    'emergencySavingsMonths',
    'pastBounces12m',
    'upcomingLargeExpense',
  ];
  if (a.incomeType === 'self_employed') base.push('incomeEvidence', 'cashIncomeHigh');
  if (a.incomeType === 'informal') base.push('cashIncomeHigh', 'coApplicant');
  if (a.incomeType === 'salaried') base.push('variablePayShareOfIncome', 'largeEmployer');
  if (a.purpose === 'business_expansion' || a.purpose === 'working_capital' || (a.amountWanted ?? 0) > 500000)
    base.push('collateralType', 'collateralValue');
  if (a.loanIsProductive) base.push('expectedMonthlyReturnFromLoan');
  if (!a.creditScoreKnown) base.push('creditScore');
  base.push('cardOutstanding', 'existingLenderRelationship');
  return base;
}

const WHAT_ANSWER_DOES: Partial<Record<keyof Answers, string>> = {
  emergencySavingsMonths: 'unlocks or protects the affordability buffer - can swing the amount by 10–20%',
  incomeEvidence: 'raises how much of your cash income counts, widening the amount',
  cashIncomeHigh: 'sets how volatile your income looks, which sets how wide every range is',
  collateralValue: 'may switch you to a secured loan - roughly half the rate, much larger amount',
  collateralType: 'decides the loan-to-value and therefore the secured ceiling',
  creditScore: 'replaces a ±2 point guess on your rate with a real number',
  cardOutstanding: 'removes an assumed 50%-utilisation obligation - tightens the amount',
  variablePayShareOfIncome: 'stops the engine treating your whole salary as stable',
  largeEmployer: 'a listed/government employer shaves ~0.5 points off the rate',
  yearsInJobOrTrade: 'longer history lowers the income haircut and the rate',
  pastBounces12m: 'confirms a clean record instead of a capped-confidence assumption',
  upcomingLargeExpense: 'a known big spend ahead lowers what you can safely carry',
  coApplicant: 'a second income can materially raise both ceilings',
  existingLenderRelationship: 'an existing relationship is worth ~0.25 points',
  expectedMonthlyReturnFromLoan: 'shows whether the loan pays for its own EMI (never added to income)',
};

const MUST_FIELDS: (keyof Answers)[] = [
  'purpose',
  'amountWanted',
  'incomeType',
  'netMonthlyIncome',
  'existingEmiTotal',
  'age',
];

function overallConfidence(a: Answers, amiConf: Confidence): Confidence {
  const mustRatio = MUST_FIELDS.filter((k) => a[k] !== undefined).length / MUST_FIELDS.length;
  const rel = relevantAdditional(a);
  const addRatio = rel.length ? rel.filter((k) => a[k] !== undefined).length / rel.length : 0;

  // Must-set answered alone must NOT reach "medium" - the brief says must-only
  // means wide ranges and LOW confidence. Additional answers do the real work.
  let score = 0.05 + 0.25 * mustRatio + 0.6 * addRatio;
  if (amiConf === 'high') score += 0.1;
  if (amiConf === 'low') score -= 0.15;
  if (!a.creditScoreKnown) score -= 0.08;
  if (a.incomeType === 'informal') score -= 0.08;

  if (score >= 0.68) return 'high';
  if (score >= 0.42) return 'medium';
  return 'low';
}

function band(point: number, conf: Confidence, roundStep: number): Range {
  const hw = CONFIDENCE.amountBandHalfWidth[conf];
  return {
    low: roundTo(Math.max(0, point * (1 - hw)), roundStep),
    high: roundTo(point * (1 + hw), roundStep),
    point: roundTo(point, roundStep),
  };
}

export function assess(a: Answers): Assessment {
  const income = assessIncome(a);
  const ami = income.assessedMonthlyIncome;
  const obligations = computeObligations(a);

  const routing = routeProduct(a);
  const productId: ProductId = routing.product;
  const p = PRODUCTS[productId];

  // First rate pass on the requested amount to get an expected rate for the ceilings
  const seedPrincipal = Math.max(a.amountWanted ?? 100000, 50000);
  const seedRate = assessRate(a, productId, seedPrincipal, p.tenureMonths[0], income.confidence);
  const expectedRate = seedRate.nominalBand.point;

  const lender = lenderCeiling(a, ami, obligations, productId, expectedRate, routing.collateralCeiling);
  const borrower = borrowerCeiling(a, ami, obligations, productId, expectedRate);

  const confidence = overallConfidence(a, income.confidence);

  // Stress + verdict on the recommended (not requested) amount
  const safePrincipal = Math.min(lender.maxPrincipal, borrower.maxPrincipal);
  const preStress = stressCases(a, ami, obligations, safePrincipal, expectedRate, borrower.tenureMonths);
  const verdict = decideVerdict(a, ami, obligations, lender, borrower, productId, preStress);

  const recommended = verdict.recommendedAmount || safePrincipal;

  // Final rate pass sized to the recommended amount
  const rate = assessRate(a, productId, Math.max(recommended, 50000), borrower.tenureMonths, confidence);

  // O2
  const useThis: 'lender' | 'borrower' = borrower.maxPrincipal <= lender.maxPrincipal ? 'borrower' : 'lender';
  const maxAmount: Assessment['maxAmount'] = {
    lenderWillSanction: band(lender.maxPrincipal, confidence, ROUND.principal),
    borrowerCanCarry: band(borrower.maxPrincipal, confidence, ROUND.principal),
    useThis,
    amount: band(Math.min(lender.maxPrincipal, borrower.maxPrincipal), confidence, ROUND.principal),
    why:
      useThis === 'borrower'
        ? `Use the borrower number. ${borrower.bindingReason} A lender might sanction up to ${inr(
            lender.maxPrincipal,
          )}, but that is their risk appetite, not your safety margin.`
        : `Use the lender number here - it is the tighter of the two. ${lender.bindingReason}`,
  };

  // O4 — for "don't borrow" there is no recommended amount, so we still show the
  // outflow picture for the amount they ASKED for, which is precisely what breaks.
  const o4Amount =
    verdict.call === 'do_not_borrow' ? Math.max(a.amountWanted ?? safePrincipal, 50000) : recommended;
  const recTenurePrudent = borrower.tenureMonths;
  const recTenureMax = p.tenureMonths[1];
  const rPrudent = expectedRateForAmount(a, productId, o4Amount, recTenurePrudent, confidence);
  const rMax = expectedRateForAmount(a, productId, o4Amount, recTenureMax, confidence);
  const lenderEmiR = roundTo(lender.maxNewEmi, ROUND.emi);
  const borrowerEmiR = roundTo(borrower.maxNewEmi, ROUND.emi);
  const emiCeiling = band(Math.min(lender.maxNewEmi, borrower.maxNewEmi), confidence, ROUND.emi);
  const stress = stressCases(a, ami, obligations, o4Amount, rate.nominalBand.point, recTenurePrudent);
  const tiPrudent = roundTo(totalInterest(o4Amount, rPrudent, recTenurePrudent), ROUND.principal);
  const tiMax = roundTo(totalInterest(o4Amount, rMax, recTenureMax), ROUND.principal);

  const outflow: Assessment['outflow'] = {
    emiCeiling,
    atRecommendedAmount: {
      amount: roundTo(o4Amount, ROUND.principal),
      prudent: {
        tenureMonths: recTenurePrudent,
        emi: roundTo(emi(o4Amount, rPrudent, recTenurePrudent), ROUND.emi),
        totalInterest: tiPrudent,
      },
      maximum: {
        tenureMonths: recTenureMax,
        emi: roundTo(emi(o4Amount, rMax, recTenureMax), ROUND.emi),
        totalInterest: tiMax,
      },
    },
    stress,
    why:
      verdict.call === 'do_not_borrow'
        ? `On the ${inr(o4Amount)} you asked for, the EMI alone is more than your budget can hold after essentials and existing debt, which is why the answer above is "don't". Your safe EMI ceiling today is ${inrM(emiCeiling.point)}.`
        : `Your EMI ceiling is ${inrM(emiCeiling.point)} - the lower of what a lender allows (${inrM(
            lenderEmiR,
          )}) and what your budget allows (${inrM(
            borrowerEmiR,
          )}). Shorter tenure costs you less: ${inr(tiPrudent)} in interest over ${
            recTenurePrudent / 12
          } years versus ${inr(tiMax)} over ${recTenureMax / 12}.`,
  };

  // Missing answers + assumptions
  const missingAnswers = relevantAdditional(a)
    .filter((k) => a[k] === undefined)
    .map((k) => ({ field: String(k), wouldDo: WHAT_ANSWER_DOES[k] ?? 'tightens one of the ranges' }));

  const assumptionsUsed: string[] = [];
  if (a.emergencySavingsMonths === undefined) assumptionsUsed.push('Emergency savings assumed 0 months (conservative).');
  if (a.monthlyHouseholdExpenses === undefined)
    assumptionsUsed.push('Household expenses set to the subsistence floor for your dependents.');
  if (!a.incomeType) assumptionsUsed.push('Income type assumed informal.');
  if (a.pastBounces12m === undefined) assumptionsUsed.push('No past bounces assumed, but confidence held at Medium at best.');
  if (a.cardOutstanding === undefined && a.cardLimit !== undefined)
    assumptionsUsed.push('Card balance assumed 50% of limit.');
  if (!a.creditScoreKnown) assumptionsUsed.push('Credit score modelled as unknown - rate band widened, not penalised.');

  const card =
    verdict.call === 'do_not_borrow'
      ? buildStopCard(a, ami, obligations, borrower, rate)
      : buildCard(a, productId, recommended, rate, outflow, useThis, routing.alternative?.product);

  // Productive-loan check: does THIS loan pay for itself? Deliberately computed
  // after everything else and never fed back into AMI/ceilings/verdict - an
  // expected return is not guaranteed income (RULES §"honesty about limits").
  let productiveCheck: Assessment['productiveCheck'];
  if (a.loanIsProductive && a.expectedMonthlyReturnFromLoan !== undefined) {
    const emiAtThisAmount = outflow.atRecommendedAmount.prudent.emi;
    const monthlySurplus = roundTo(a.expectedMonthlyReturnFromLoan - emiAtThisAmount, ROUND.emi);
    const coversEmi = monthlySurplus >= 0;
    productiveCheck = {
      expectedMonthlyReturn: a.expectedMonthlyReturnFromLoan,
      emiAtThisAmount,
      monthlySurplus,
      coversEmi,
      note: coversEmi
        ? `At ${inrM(a.expectedMonthlyReturnFromLoan)}/month expected, this loan covers its own EMI (${inrM(
            emiAtThisAmount,
          )}) with about ${inrM(monthlySurplus)}/month left over. That is a reason to lean "borrow", but it is not counted as income anywhere above - an expected return is not guaranteed, so it never raises what you are allowed to borrow.`
        : `At ${inrM(a.expectedMonthlyReturnFromLoan)}/month expected, this loan does not cover its own EMI (${inrM(
            emiAtThisAmount,
          )}) - a shortfall of ${inrM(Math.abs(monthlySurplus))}/month. The loan may still be worth taking for other reasons, but on these numbers it would not pay for itself, which strengthens caution even where the verdict above is "borrow".`,
    };
  }

  return {
    income,
    obligations,
    product: productId,
    productLabel: productLabel(productId),
    routingWhy: routing.why + (routing.alternative ? ' ' + routing.alternative.why : ''),
    confidence,
    missingAnswers,
    assumptionsUsed,
    verdict: {
      call: verdict.call,
      headline: verdict.headline,
      why: verdict.why,
      constructivePath: verdict.constructivePath,
    },
    maxAmount,
    rate,
    productiveCheck,
    outflow,
    card,
  };
}

function expectedRateForAmount(
  a: Answers,
  productId: ProductId,
  amount: number,
  tenure: number,
  confidence: Confidence,
): number {
  return assessRate(a, productId, Math.max(amount, 50000), tenure, confidence).nominalBand.point;
}

/**
 * When the verdict is "don't borrow", the card is not a negotiation card - it is
 * a card the borrower holds up to STOP a lender closing a sale today, plus the
 * one or two moves that actually help.
 */
function buildStopCard(
  a: Answers,
  ami: number,
  obligations: Obligations,
  borrower: ReturnType<typeof borrowerCeiling>,
  _rate: Assessment['rate'],
): Assessment['card'] {
  const bullets: string[] = [];
  bullets.push('I am not signing a sanction letter today. This is a "not yet".');
  if ((obligations.highCostDebt ?? 0) > 0)
    bullets.push(
      `First priority: replace my ${inr(
        obligations.highCostDebt,
      )} of 28%+ app / informal debt with a gold loan or consolidation loan at 14–18%.`,
    );
  if (a.bounceWithin3m) bullets.push('I need three clean repayment months on record before I apply anywhere.');
  const room = Math.max(0, borrower.maxNewEmi);
  bullets.push(
    room > 0
      ? `The most I could responsibly service is about ${inrM(room)}/month - roughly ${inr(
          Math.max(0, borrower.maxPrincipal),
        )}. Anything above that is a sale, not a fit.`
      : `Right now there is no room for any new EMI at all. A loan today comes straight out of essentials.`,
  );
  if (a.purpose === 'vehicle')
    bullets.push('For the vehicle: OEM / state EV scheme financing with a large down-payment, not a personal or top-up loan.');
  bullets.push('Re-check in 3 months - the answer changes when income steadies or the expensive debt is gone.');

  return {
    product: 'No loan - yet',
    amount:
      Math.max(0, borrower.maxPrincipal) > 0
        ? `₹0 now (safe ceiling ≈ ${inr(borrower.maxPrincipal)})`
        : '₹0 now',
    fairRate: 'n/a',
    fairApr: 'n/a',
    emiCeiling: room > 0 ? inrM(room) + ' absolute max' : 'no room for a new EMI',
    tenure: 'n/a',
    walkAwayLine: `Assessed income ${inrM(ami)}. After essentials and existing debt there is nothing left for a new EMI - signing one now risks the next bounce.`,
    bullets,
  };
}

function buildCard(
  a: Answers,
  productId: ProductId,
  recommended: number,
  rate: Assessment['rate'],
  outflow: Assessment['outflow'],
  useThis: 'lender' | 'borrower',
  altProduct?: ProductId,
): Assessment['card'] {
  const p = PRODUCTS[productId];
  const bullets: string[] = [];
  bullets.push(
    `This is ${p.secured ? 'a SECURED' : 'an unsecured'} loan${
      p.secured ? ' - price it as one, not as a personal loan.' : '.'
    }`,
  );
  if (a.creditScoreKnown && a.creditScore) bullets.push(`Credit score ${a.creditScore}.`);
  else bullets.push(`No bureau score - for a secured loan that barely matters.`);
  bullets.push(
    `Fair all-in APR for my profile: ${pct(rate.aprBand.low)}–${pct(
      rate.aprBand.high,
    )}. Anything above ${pct(rate.aprBand.high + 1.5)} APR is a markup.`,
  );
  bullets.push(
    `I will not cross an EMI of ${inrM(outflow.emiCeiling.point)}. Prefer ${
      outflow.atRecommendedAmount.prudent.tenureMonths / 12
    } years over ${outflow.atRecommendedAmount.maximum.tenureMonths / 12}.`,
  );
  if (altProduct)
    bullets.push(`I qualify for a ${PRODUCTS[altProduct].label} - quote me that, not an unsecured rate.`);
  bullets.push(
    useThis === 'borrower'
      ? `I am asking for ${inrShort(recommended)}, which is what I can carry - not the maximum you will offer.`
      : `${inrShort(recommended)} is my ceiling on your own sanction math.`,
  );

  return {
    product: p.label,
    amount: inrShort(recommended),
    fairRate: `${pct(rate.nominalBand.low)}–${pct(rate.nominalBand.high)} p.a.`,
    fairApr: `${pct(rate.aprBand.low)}–${pct(rate.aprBand.high)} all-in`,
    emiCeiling: inrM(outflow.emiCeiling.point),
    tenure: `${outflow.atRecommendedAmount.prudent.tenureMonths / 12} yrs (not ${
      outflow.atRecommendedAmount.maximum.tenureMonths / 12
    })`,
    walkAwayLine: `If the offer's all-in APR is above ${pct(
      rate.aprBand.high + 1.5,
    )} or the EMI above ${inrM(outflow.emiCeiling.point)}, I walk.`,
    bullets,
  };
}
