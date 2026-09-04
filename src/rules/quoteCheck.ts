import { apr, emi, totalInterest } from './finance';
import type { RateResult } from './types';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const pct = (n: number) => n.toFixed(1) + '%';

export interface QuoteInput {
  amount: number;
  ratePct: number;
  tenureMonths: number;
  /** processing fee in rupees, as the lender quoted it (not a %) */
  feeRupees: number;
  /** any bundled insurance / other one-time charge in rupees, 0 if none disclosed */
  otherChargesRupees: number;
}

export type QuoteVerdict = 'within_range' | 'above_range' | 'below_range';

export interface QuoteCheckResult {
  /** what the lender sanctions - i.e. the amount typed in, echoed back for the apples-to-apples table */
  sanctionedAmount: number;
  emi: number;
  netDisbursed: number;
  /** every EMI added up over the full tenure - the total cash that leaves the borrower's account */
  totalRepayment: number;
  apr: number;
  verdict: QuoteVerdict;
  /** percentage points the quote's APR sits above the top of the fair band (0 if not above) */
  pointsAboveFair: number;
  /** what this quote costs, in total interest, versus pricing at the TOP of the fair nominal band */
  extraCostVsFairTop: number;
  headline: string;
  note: string;
}

/**
 * Compares a lender's actual quote against the assessment's fair rate band.
 * This is deliberately NOT part of assess() - it runs on demand, after the
 * borrower has an offer in hand, against the SAME finance math (finance.ts)
 * used everywhere else, so a quote is judged by the identical yardstick as
 * the fair band it is compared to.
 */
export function checkQuote(fair: RateResult, q: QuoteInput): QuoteCheckResult {
  const quoteEmi = emi(q.amount, q.ratePct, q.tenureMonths);
  const upfront = q.feeRupees + q.otherChargesRupees;
  const netDisbursed = q.amount - upfront;
  const quoteApr = apr(q.amount, upfront, quoteEmi, q.tenureMonths);

  const EPS = 0.05; // percentage points - avoid flip-flopping right at the edge
  let verdict: QuoteVerdict;
  if (quoteApr > fair.aprBand.high + EPS) verdict = 'above_range';
  else if (quoteApr < fair.aprBand.low - EPS) verdict = 'below_range';
  else verdict = 'within_range';

  const pointsAboveFair = Math.max(0, quoteApr - fair.aprBand.high);

  // What pricing at the top of the FAIR NOMINAL band (same amount, same tenure)
  // would have cost in interest, versus what this quote actually costs. This is
  // the number to put in front of a lender: "this is what your markup costs me."
  const fairTopInterest = totalInterest(q.amount, fair.nominalBand.high, q.tenureMonths);
  const quoteInterest = totalInterest(q.amount, q.ratePct, q.tenureMonths);
  const extraCostVsFairTop = Math.max(0, quoteInterest - fairTopInterest);

  let headline: string;
  let note: string;
  if (verdict === 'above_range') {
    headline = `This quote is above your fair range by ${pct(pointsAboveFair)}.`;
    note =
      `All-in APR on this offer is ${pct(quoteApr)}, against a fair range of ${pct(
        fair.aprBand.low,
      )}-${pct(fair.aprBand.high)} for your profile. ` +
      (extraCostVsFairTop > 0
        ? `Even against the TOP of that range, this quote costs about ${inr(
            extraCostVsFairTop,
          )} more in interest over the life of the loan. Ask the lender to explain the premium, or walk.`
        : `Ask the lender to explain the premium, or walk.`);
  } else if (verdict === 'below_range') {
    headline = `This quote is better than your fair range - worth double-checking the fine print.`;
    note = `All-in APR on this offer is ${pct(quoteApr)}, below the ${pct(
      fair.aprBand.low,
    )}-${pct(fair.aprBand.high)} range modelled for your profile. Good news, but confirm there is no undisclosed charge or a teaser rate that resets later.`;
  } else {
    headline = `This quote is within your fair range.`;
    note = `All-in APR on this offer is ${pct(quoteApr)}, inside the ${pct(fair.aprBand.low)}-${pct(
      fair.aprBand.high,
    )} range modelled for your profile. Reasonable - no obvious markup.`;
  }

  return {
    sanctionedAmount: q.amount,
    emi: quoteEmi,
    netDisbursed,
    totalRepayment: quoteEmi * q.tenureMonths,
    apr: quoteApr,
    verdict,
    pointsAboveFair,
    extraCostVsFairTop,
    headline,
    note,
  };
}
