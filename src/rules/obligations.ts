import { DEFAULTS, OBLIGATIONS } from './config';
import type { Answers, Obligations } from './types';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/**
 * §2 - Everything already committed each month. This is the FOIR numerator
 * (before the new loan). "Unknown is never zero" - a held card with an unknown
 * balance is modelled at assumed utilisation, not ignored.
 */
export function computeObligations(a: Answers): Obligations {
  const breakdown: { label: string; amount: number }[] = [];

  const emis = a.existingEmiTotal ?? 0;
  if (emis > 0) breakdown.push({ label: `Existing loan EMIs`, amount: emis });

  // Credit-card minimum due
  let cardBalance = a.cardOutstanding;
  if (cardBalance === undefined && a.cardLimit !== undefined) {
    cardBalance = a.cardLimit * DEFAULTS.cardUtilisation;
  }
  if (cardBalance && cardBalance > 0) {
    const minDue = cardBalance * OBLIGATIONS.cardMinDueRate;
    breakdown.push({
      label:
        a.cardOutstanding === undefined
          ? `Card minimum due (balance assumed ${Math.round(DEFAULTS.cardUtilisation * 100)}% of limit)`
          : `Card minimum due (5% of ${inr(cardBalance)})`,
      amount: minDue,
    });
  }

  // High-cost / app-loan repayments - counted, and flagged
  const highCostDebt = a.highCostDebtOutstanding ?? 0;
  if (highCostDebt > 0) {
    // short-tenor app loans: approximate monthly outflow at ~12% of balance
    const approxMonthly = highCostDebt * 0.12;
    breakdown.push({ label: `High-cost debt repayments (est.)`, amount: approxMonthly });
  }

  const total = breakdown.reduce((s, x) => s + x.amount, 0);
  return { total, breakdown, highCostDebt };
}
