import { INCOME } from './config';
import type { Answers, Confidence, IncomeAssessment } from './types';

/** ₹ formatting for notes. */
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/**
 * §1 - Assessed Monthly Income (AMI): what we believe they actually earn,
 * never what they stated at face value (for non-salaried).
 */
export function assessIncome(a: Answers): IncomeAssessment {
  const notes: string[] = [];
  const type = a.incomeType ?? 'informal'; // §11 default
  if (!a.incomeType) notes.push('Income type not given - treated as informal (conservative).');

  let ami = 0;
  let confidence: Confidence = 'low';

  if (type === 'salaried') {
    const net = a.netMonthlyIncome ?? 0;
    let counted = net;
    const varShare = a.variablePayShareOfIncome ?? 0;
    if (varShare > 0) {
      const stable = net * (1 - varShare);
      const variable = net * varShare;
      if ((a.yearsInJobOrTrade ?? 0) >= 2) {
        counted = stable + variable * INCOME.variablePayShare;
        notes.push(
          `Variable pay is ~${Math.round(varShare * 100)}% of take-home; counted at ${Math.round(
            INCOME.variablePayShare * 100,
          )}% given 2+ years' history.`,
        );
      } else {
        counted = stable;
        notes.push('Variable pay excluded - under 2 years of history to rely on it.');
      }
    }
    ami = counted;
    confidence = 'high';
    notes.push(`Salaried: assessed income = take-home ${inr(ami)}.`);
  } else if (type === 'self_employed') {
    const itrMonthly = a.netMonthlyIncome ?? 0;
    const cashLow = a.cashIncomeLow ?? itrMonthly;
    const evidence = a.incomeEvidence ?? 'none';
    const uplift = INCOME.cashUpliftFactor[evidence];
    const cashOverItr = Math.max(0, cashLow - itrMonthly);
    ami = itrMonthly + cashOverItr * uplift;
    confidence = evidence === 'none' ? 'low' : 'medium';
    notes.push(
      `Self-employed: ITR income ${inr(itrMonthly)} + ${Math.round(uplift * 100)}% of cash above ITR ` +
        `(${inr(cashOverItr)}) = ${inr(ami)}. Evidence level: ${evidence}.`,
    );
  } else {
    // informal
    const low = a.cashIncomeLow ?? a.netMonthlyIncome ?? 0;
    const high = a.cashIncomeHigh ?? low;
    const established = (a.yearsInJobOrTrade ?? 0) >= 3;
    const haircut = established ? INCOME.informalHaircut.established : INCOME.informalHaircut.default;
    ami = low * haircut;
    confidence = 'low';
    notes.push(
      `Informal income: planned on the low end of the range (${inr(low)}) × ${Math.round(
        haircut * 100,
      )}% dependable = ${inr(ami)}. The good months are not counted - they are the buffer.`,
    );
    if (high > low && (high - low) / ((high + low) / 2) > INCOME.rangeWidthLowConfidence) {
      notes.push('Month-to-month swing is wide, so every range in this report is wide too.');
    }
  }

  // Co-applicant clubbing
  if (a.coApplicant && (a.coApplicantIncome ?? 0) > 0) {
    const share = a.coApplicantDocumented
      ? INCOME.coApplicantShare.documented
      : INCOME.coApplicantShare.undocumented;
    const add = (a.coApplicantIncome ?? 0) * share;
    ami += add;
    notes.push(
      `Co-applicant income ${inr(a.coApplicantIncome ?? 0)} added at ${Math.round(share * 100)}% ` +
        `(${a.coApplicantDocumented ? 'documented' : 'undocumented'}) = +${inr(add)}.`,
    );
  }

  return { assessedMonthlyIncome: Math.max(0, ami), confidence, notes };
}
