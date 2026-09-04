import type { Answers } from '../rules/types';

/**
 * The three borrowers from the brief, encoded as the answers each would give.
 * Used by the app's "Try a sample borrower" shortcut and by engine.test.ts.
 * Where the brief is silent, the field is left undefined so the engine's
 * documented defaults apply - exactly as they would for a real user who skips it.
 */
export interface Persona {
  id: string;
  name: string;
  blurb: string;
  answers: Answers;
}

export const PERSONAS: Persona[] = [
  {
    id: 'priya',
    name: 'Priya, 29 - Bengaluru, salaried',
    blurb:
      'Software engineer at a large MNC for 5 years. Net ₹1,10,000/month. One car loan, EMI ₹14,000, 2 years left. Credit score 780. Rents at ₹28,000. Wants ₹8,00,000 personal loan for a wedding.',
    answers: {
      purpose: 'wedding',
      amountWanted: 800000,
      incomeType: 'salaried',
      netMonthlyIncome: 110000,
      existingEmiTotal: 14000,
      age: 29,
      creditScoreKnown: true,
      creditScore: 780,
      dependents: 0,
      rentPaid: 28000,
      yearsInJobOrTrade: 5,
      largeEmployer: true,
      loanIsProductive: false,
    },
  },
  {
    id: 'ravi',
    name: 'Ravi, 42 - Mysuru, self-employed',
    blurb:
      'Kirana store for 14 years. Cash income ₹40,000–80,000/month; ITR shows ₹4,20,000/year. Owns the shop premises, ~₹45,00,000, unencumbered. Never taken a formal loan; no credit score. Wife earns ₹18,000 teaching. Wants ₹15,00,000 for a second stock line and a delivery vehicle.',
    answers: {
      purpose: 'business_expansion',
      amountWanted: 1500000,
      incomeType: 'self_employed',
      netMonthlyIncome: 35000, // ₹4.2L / 12
      cashIncomeLow: 40000,
      cashIncomeHigh: 80000,
      existingEmiTotal: 0,
      age: 42,
      creditScoreKnown: false,
      neverBorrowed: true, // 14 years in trade, never taken a formal loan
      dependents: 0, // wife earns and is a co-applicant, so not a dependent (RULES §4)
      yearsInJobOrTrade: 14,
      incomeEvidence: 'none',
      collateralType: 'commercial',
      collateralValue: 4500000,
      collateralEncumbered: false,
      coApplicant: true,
      coApplicantIncome: 18000,
      coApplicantDocumented: false,
      loanIsProductive: true,
      expectedMonthlyReturnFromLoan: 25000,
    },
  },
  {
    id: 'anita',
    name: 'Anita, 35 - Hubballi, informal',
    blurb:
      'Delivery-platform rider plus home tailoring. ₹26,000–30,000/month, two children, husband unemployed 8 months. Three app loans, ₹35,000 outstanding at 30%+, one EMI bounced last month. Wants ₹1,50,000 for an electric scooter to double delivery runs.',
    answers: {
      purpose: 'vehicle',
      amountWanted: 150000,
      incomeType: 'informal',
      netMonthlyIncome: 26000,
      cashIncomeLow: 26000,
      cashIncomeHigh: 30000,
      existingEmiTotal: 0,
      age: 35,
      creditScoreKnown: false,
      dependents: 3, // husband + two children
      yearsInJobOrTrade: 2,
      highCostDebtOutstanding: 35000,
      bounceWithin3m: true,
      pastBounces12m: 1,
      emergencySavingsMonths: 0,
      loanIsProductive: true,
      expectedMonthlyReturnFromLoan: 6000,
    },
  },
];
