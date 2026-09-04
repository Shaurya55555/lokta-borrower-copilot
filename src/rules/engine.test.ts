import { describe, expect, it } from 'vitest';
import { assess } from './engine';
import { apr, emi } from './finance';
import { checkQuote } from './quoteCheck';
import { PERSONAS } from '../personas';

const byId = (id: string) => PERSONAS.find((p) => p.id === id)!.answers;

describe('finance', () => {
  it('EMI matches the standard formula', () => {
    // ₹1,00,000 at 12% for 12 months ≈ ₹8,885
    expect(Math.round(emi(100000, 12, 12))).toBe(8885);
  });
  it('APR of a fee-free loan equals its nominal rate', () => {
    const e = emi(500000, 14, 48);
    expect(apr(500000, 0, e, 48)).toBeCloseTo(14, 1);
  });
  it('APR rises above nominal once fees are added', () => {
    const e = emi(500000, 14, 48);
    const withFee = apr(500000, 500000 * 0.02 * 1.18, e, 48);
    expect(withFee).toBeGreaterThan(14.5);
    expect(withFee).toBeLessThan(16.5);
  });
});

describe('Priya - salaried, prime, consumption loan', () => {
  const r = assess(byId('priya'));
  it('routes to a personal loan', () => {
    expect(r.product).toBe('personal');
  });
  it('lender number is well above the borrower number', () => {
    expect(r.maxAmount.lenderWillSanction.point).toBeGreaterThan(r.maxAmount.borrowerCanCarry.point);
    expect(r.maxAmount.useThis).toBe('borrower');
  });
  it('the consumption cap binds the borrower number', () => {
    // 20% of ₹1,10,000 = ₹22,000 EMI ceiling
    expect(r.outflow.emiCeiling.point).toBeLessThanOrEqual(22100);
  });
  it('prices near the floor of the personal-loan band for an 780 score', () => {
    expect(r.rate.nominalBand.point).toBeLessThan(13);
  });
  it('verdict is borrow or borrow-less, never "don\'t"', () => {
    expect(['borrow', 'borrow_less']).toContain(r.verdict.call);
  });
});

describe('Ravi - self-employed, thin file, owns his shop', () => {
  const r = assess(byId('ravi'));
  it('is routed to a SECURED product, not an unsecured business loan', () => {
    expect(['lap', 'home', 'gold']).toContain(r.product);
    expect(r.product).toBe('lap');
  });
  it('can reach the ₹15,00,000 ask on the secured route', () => {
    expect(r.maxAmount.lenderWillSanction.point).toBeGreaterThanOrEqual(1500000);
  });
  it('prices far below an unsecured business loan (which starts at 15%)', () => {
    expect(r.rate.nominalBand.high).toBeLessThan(15);
  });
  it('does not brutally penalise the missing credit score on a secured loan', () => {
    // thin-file secured add-on is small; centre stays within the LAP band midpoint + ~1
    expect(r.rate.nominalBand.point).toBeLessThan(12.5);
  });
  it('verdict lets him borrow (as requested or slightly less)', () => {
    expect(['borrow', 'borrow_less']).toContain(r.verdict.call);
  });
  it('the productive-loan check shows the stock/vehicle covering its own EMI', () => {
    expect(r.productiveCheck).toBeDefined();
    expect(r.productiveCheck!.coversEmi).toBe(true);
    expect(r.productiveCheck!.monthlySurplus).toBeGreaterThan(0);
  });
});

describe('Anita - informal, fresh bounce, 30% app loans', () => {
  const r = assess(byId('anita'));
  it('says do not borrow', () => {
    expect(r.verdict.call).toBe('do_not_borrow');
  });
  it('still hands her a constructive path', () => {
    expect(r.verdict.constructivePath && r.verdict.constructivePath.length).toBeGreaterThan(0);
  });
  it('the path names the high-cost debt as the first thing to fix', () => {
    expect(r.verdict.constructivePath!.join(' ')).toMatch(/28%|gold loan|consolidat/i);
  });
  it('borrower-can-carry is essentially zero', () => {
    expect(r.maxAmount.borrowerCanCarry.point).toBeLessThan(60000);
  });
  it('the productive-loan check still runs even though the verdict is "don\'t borrow" - the scooter\'s own economics and the household\'s ability to carry any new debt are separate questions', () => {
    expect(r.productiveCheck).toBeDefined();
    expect(r.productiveCheck!.expectedMonthlyReturn).toBeGreaterThan(0);
  });
});

describe('productive-loan check never leaks into affordability', () => {
  it('a huge claimed return does not change AMI, ceilings, or the verdict', () => {
    const modest = assess(byId('ravi'));
    const inflated = assess({ ...byId('ravi'), expectedMonthlyReturnFromLoan: 5000000 });
    expect(inflated.maxAmount.borrowerCanCarry.point).toBe(modest.maxAmount.borrowerCanCarry.point);
    expect(inflated.outflow.emiCeiling.point).toBe(modest.outflow.emiCeiling.point);
    expect(inflated.verdict.call).toBe(modest.verdict.call);
    expect(inflated.productiveCheck!.monthlySurplus).toBeGreaterThan(modest.productiveCheck!.monthlySurplus);
  });
  it('is absent when the loan is not marked productive', () => {
    const r = assess(byId('priya'));
    expect(r.productiveCheck).toBeUndefined();
  });
});

describe('quote checker', () => {
  const r = assess(byId('priya'));
  it('flags a quote priced above the fair band, with a positive extra cost', () => {
    const q = checkQuote(r.rate, {
      amount: 661000,
      ratePct: r.rate.nominalBand.high + 5,
      tenureMonths: 36,
      feeRupees: 15000,
      otherChargesRupees: 0,
    });
    expect(q.verdict).toBe('above_range');
    expect(q.extraCostVsFairTop).toBeGreaterThan(0);
    expect(q.pointsAboveFair).toBeGreaterThan(0);
  });
  it('accepts a quote priced inside the fair band', () => {
    // Zero fees means quote APR == quoted nominal rate (see the finance suite
    // above), so quoting the midpoint of the fair APR band with no fees lands
    // squarely inside it.
    const q = checkQuote(r.rate, {
      amount: 661000,
      ratePct: r.rate.aprBand.point,
      tenureMonths: 36,
      feeRupees: 0,
      otherChargesRupees: 0,
    });
    expect(q.verdict).toBe('within_range');
  });
  it('extra cost vs. the fair band is never negative', () => {
    const cheap = checkQuote(r.rate, {
      amount: 661000,
      ratePct: r.rate.nominalBand.low,
      tenureMonths: 36,
      feeRupees: 0,
      otherChargesRupees: 0,
    });
    expect(cheap.extraCostVsFairTop).toBe(0);
    expect(cheap.extraCostVsFairTop).toBeGreaterThanOrEqual(0);
  });
});

describe('cross-cutting rules', () => {
  it('unknown credit score widens the rate band and is not treated as a low score', () => {
    const withScore = assess({ ...byId('priya') });
    const noScore = assess({ ...byId('priya'), creditScoreKnown: false, creditScore: undefined });
    const badScore = assess({ ...byId('priya'), creditScoreKnown: true, creditScore: 610 });
    const width = (x: typeof noScore) => x.rate.nominalBand.high - x.rate.nominalBand.low;
    // wider band under uncertainty
    expect(width(noScore)).toBeGreaterThan(width(withScore));
    // not penalised like a genuinely bad score...
    expect(noScore.rate.nominalBand.point).toBeLessThan(badScore.rate.nominalBand.point - 1);
    // ...and centre stays at/below the band midpoint, never above it
    expect(noScore.rate.nominalBand.point).toBeLessThanOrEqual((10.5 + 24) / 2 + 0.01);
  });
  it('fewer answers → wider amount band (confidence widens with silence)', () => {
    const full = assess(byId('priya'));
    const sparse = assess({
      purpose: 'wedding',
      amountWanted: 800000,
      incomeType: 'salaried',
      netMonthlyIncome: 110000,
      existingEmiTotal: 14000,
      age: 29,
    });
    const frac = (x: typeof full) =>
      (x.maxAmount.amount.high - x.maxAmount.amount.low) / Math.max(1, x.maxAmount.amount.point);
    expect(sparse.confidence).toBe('low');
    expect(full.confidence).not.toBe('low');
    expect(frac(sparse)).toBeGreaterThan(frac(full));
  });
  it('every output carries a one-sentence why', () => {
    const r = assess(byId('priya'));
    expect(r.verdict.why.length).toBeGreaterThan(20);
    expect(r.maxAmount.why.length).toBeGreaterThan(20);
    expect(r.outflow.why.length).toBeGreaterThan(20);
  });
});
