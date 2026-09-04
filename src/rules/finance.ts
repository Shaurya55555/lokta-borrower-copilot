/**
 * Pure loan mathematics. No app logic, no config - just formulas.
 * Everything here is standard reducing-balance / time-value-of-money.
 */

/** Reducing-balance EMI. `annualRatePct` e.g. 11.5, `months` e.g. 36. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Largest principal whose EMI does not exceed `maxEmi`. Inverse of emi(). */
export function maxPrincipalForEmi(maxEmi: number, annualRatePct: number, months: number): number {
  if (maxEmi <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return maxEmi * months;
  const f = Math.pow(1 + r, months);
  return (maxEmi * (f - 1)) / (r * f);
}

/** Total interest paid over the life of a loan. */
export function totalInterest(principal: number, annualRatePct: number, months: number): number {
  return emi(principal, annualRatePct, months) * months - principal;
}

/** Net present value of a cashflow array at a per-period rate. cf[0] is t=0. */
function npv(perPeriodRate: number, cf: number[]): number {
  let acc = 0;
  for (let t = 0; t < cf.length; t++) acc += cf[t] / Math.pow(1 + perPeriodRate, t);
  return acc;
}

/**
 * All-in APR (annualised IRR) of a loan.
 * Borrower receives (principal - upfrontFees) at t0, then pays `emi` for `months`.
 * Returns an annual percentage, e.g. 13.4.
 */
export function apr(principal: number, upfrontFees: number, monthlyEmi: number, months: number): number {
  const disbursed = principal - upfrontFees;
  if (disbursed <= 0 || monthlyEmi <= 0 || months <= 0) return 0;
  const cf = [disbursed, ...Array(months).fill(-monthlyEmi)];
  // Bisection on the monthly rate. With cf[0] > 0 and later cashflows < 0, NPV is
  // monotonically INCREASING in the rate: too-low a rate → NPV < 0, too-high → NPV > 0.
  let lo = 1e-9;
  let hi = 1.0; // 100% per month - an absurdly loose upper bracket
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid, cf);
    if (Math.abs(v) < 1e-6) {
      lo = hi = mid;
      break;
    }
    if (v < 0) lo = mid; // rate too low, raise it
    else hi = mid; // rate too high, lower it
  }
  const monthly = (lo + hi) / 2;
  // Annualise with the same nominal convention lenders quote rates in (× 12), so a
  // fee-free loan's APR equals its nominal rate and the gap is purely the fees.
  return monthly * 12 * 100;
}

/** Round for display: principals to nearest step (default ₹1,000). */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Clamp helper. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
