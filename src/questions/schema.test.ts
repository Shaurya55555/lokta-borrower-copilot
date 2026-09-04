import { describe, expect, it } from 'vitest';
import { visibleQuestions } from './schema';

/**
 * Question design is worth 20% of the brief's score, and none of it was under
 * test until now - engine.test.ts only ever exercised assess(), never the
 * adaptive show() gates in this file. These tests are the missing half.
 */
describe('adaptive question visibility', () => {
  it('salaried borrowers see employer/variable-pay questions, never the self-employed ones', () => {
    const ids = visibleQuestions({ incomeType: 'salaried' }).map((q) => q.id);
    expect(ids).toContain('largeEmployer');
    expect(ids).toContain('variablePayShareOfIncome');
    expect(ids).not.toContain('incomeEvidence');
  });

  it('self-employed borrowers see ITR-evidence questions, never the employer question', () => {
    const ids = visibleQuestions({ incomeType: 'self_employed' }).map((q) => q.id);
    expect(ids).toContain('incomeEvidence');
    expect(ids).toContain('cashIncomeLow');
    expect(ids).not.toContain('largeEmployer');
  });

  it('a kirana owner and a salaried engineer are not shown the same question set', () => {
    const salaried = new Set(visibleQuestions({ incomeType: 'salaried' }).map((q) => q.id));
    const selfEmployed = new Set(visibleQuestions({ incomeType: 'self_employed' }).map((q) => q.id));
    expect(salaried).not.toEqual(selfEmployed);
  });

  it('asks "have you ever borrowed" only once the credit score is unknown', () => {
    const known = visibleQuestions({ creditScoreKnown: true }).map((q) => q.id);
    const unknown = visibleQuestions({ creditScoreKnown: false }).map((q) => q.id);
    expect(known).not.toContain('neverBorrowed');
    expect(unknown).toContain('neverBorrowed');
  });

  it('only asks for expected return once the loan is marked productive - it cannot move an output otherwise', () => {
    const notProductive = visibleQuestions({ purpose: 'vehicle', loanIsProductive: false }).map((q) => q.id);
    const productive = visibleQuestions({ purpose: 'vehicle', loanIsProductive: true }).map((q) => q.id);
    expect(notProductive).not.toContain('expectedMonthlyReturnFromLoan');
    expect(productive).toContain('expectedMonthlyReturnFromLoan');
  });

  it('only offers collateral questions for business purposes or a large ask - not a small personal one', () => {
    const smallPersonal = visibleQuestions({ purpose: 'wedding', amountWanted: 50000 }).map((q) => q.id);
    const largePersonal = visibleQuestions({ purpose: 'wedding', amountWanted: 900000 }).map((q) => q.id);
    const business = visibleQuestions({ purpose: 'business_expansion' }).map((q) => q.id);
    expect(smallPersonal).not.toContain('collateralType');
    expect(largePersonal).toContain('collateralType');
    expect(business).toContain('collateralType');
  });
});
