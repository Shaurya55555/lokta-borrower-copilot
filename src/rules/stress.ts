import { STRESS } from './config';
import { emi } from './finance';
import type { Answers, Obligations, StressCase } from './types';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function label(foir: number, canPay: boolean): StressCase['outcome'] {
  // "canPay" here means the shocked EMI still fits inside the borrower's HARD
  // capacity (income minus existing obligations) - not the safe-with-buffers
  // number. A loan sized to the safe EMI will, by construction, poke past that
  // safe number under any rate rise; that is "tight", not "ruin".
  if (!canPay || foir > STRESS.verdictBands.tight) return 'breaks';
  if (foir > STRESS.verdictBands.comfortable) return 'tight';
  return 'comfortable';
}

/**
 * §9 - two stress cases on the RECOMMENDED loan: income drops, or rate rises.
 */
export function stressCases(
  _a: Answers,
  ami: number,
  obligations: Obligations,
  recommendedPrincipal: number,
  nominalRatePct: number,
  tenureMonths: number,
): StressCase[] {
  const hardCapacity = Math.max(0, ami - obligations.total);
  const baseEmi = emi(recommendedPrincipal, nominalRatePct, tenureMonths);
  const out: StressCase[] = [];

  // 1. Income −20%
  {
    const shockIncome = ami * STRESS.incomeDropFactor;
    const foir = (obligations.total + baseEmi) / shockIncome;
    const canPay = baseEmi <= Math.max(0, shockIncome - obligations.total);
    out.push({
      label: 'Income drops 20%',
      scenario: `Slow season, a lost client, or a month off sick: income falls to ${inr(shockIncome)}.`,
      foir,
      outcome: label(foir, canPay),
      detail: `EMI ${inr(baseEmi)} + existing ${inr(obligations.total)} = ${Math.round(
        foir * 100,
      )}% of the reduced income.`,
    });
  }

  // 2. Rate +2 pts (and note worst case +3)
  {
    const shockRate = nominalRatePct + STRESS.rateRisePts;
    const shockEmi = emi(recommendedPrincipal, shockRate, tenureMonths);
    const foir = (obligations.total + shockEmi) / ami;
    // "can pay" = the stressed EMI still fits inside hard capacity (income − existing)
    const canPay = shockEmi <= hardCapacity;
    out.push({
      label: 'Rate rises 2 points',
      scenario: `A repo-rate cycle lifts your rate to ${shockRate.toFixed(1)}% (floating loans move with RBI).`,
      foir,
      outcome: label(foir, canPay),
      detail: `EMI rises to ${inr(shockEmi)} (+${inr(shockEmi - baseEmi)}/month). Worst case at +${
        STRESS.rateRiseWorstPts
      } pts: ${inr(emi(recommendedPrincipal, nominalRatePct + STRESS.rateRiseWorstPts, tenureMonths))}.`,
    });
  }

  return out;
}
