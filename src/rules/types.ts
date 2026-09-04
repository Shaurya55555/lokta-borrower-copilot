import type { ProductId } from './config';

export type IncomeType = 'salaried' | 'self_employed' | 'informal';

export type LoanPurpose =
  | 'home_purchase'
  | 'home_renovation'
  | 'business_expansion'
  | 'working_capital'
  | 'vehicle'
  | 'wedding'
  | 'medical_elective'
  | 'travel'
  | 'consumer_durable'
  | 'debt_consolidation_lifestyle'
  | 'education'
  | 'other_consumption';

export type EvidenceLevel = 'none' | 'bankStatements' | 'gst';

/**
 * Everything the borrower can tell us. `undefined` means "not answered" and the
 * engine substitutes a documented conservative default (config.DEFAULTS / RULES §11).
 * No field is ever silently treated as zero when zero would flatter the borrower.
 */
export interface Answers {
  // ── Must-set (RULES §"Must questions") ──────────────────────────────
  purpose?: LoanPurpose;
  amountWanted?: number;
  incomeType?: IncomeType;
  /** salaried/informal: net monthly take-home. self-employed: monthly figure from ITR. */
  netMonthlyIncome?: number;
  /** self-employed & informal: typical cash income, low end of the month-to-month range */
  cashIncomeLow?: number;
  cashIncomeHigh?: number;
  existingEmiTotal?: number;
  monthlyHouseholdExpenses?: number;
  age?: number;
  creditScoreKnown?: boolean;
  creditScore?: number;
  /** true = has never taken a formal loan (a genuine thin file, e.g. Ravi) */
  neverBorrowed?: boolean;
  dependents?: number;
  rentPaid?: number;

  // ── Additional - each one must move a number (RULES §"Additional questions") ──
  yearsInJobOrTrade?: number;
  incomeEvidence?: EvidenceLevel;
  variablePayShareOfIncome?: number;   // 0..1 of netMonthlyIncome that is variable
  cardOutstanding?: number;
  cardLimit?: number;
  pastBounces12m?: number;
  bounceWithin3m?: boolean;
  emergencySavingsMonths?: number;
  collateralType?: 'residential' | 'commercial' | 'gold' | 'none';
  collateralValue?: number;
  collateralEncumbered?: boolean;
  coApplicant?: boolean;
  coApplicantIncome?: number;
  coApplicantDocumented?: boolean;
  upcomingLargeExpense?: number;
  loanIsProductive?: boolean;          // will this loan earn money?
  expectedMonthlyReturnFromLoan?: number;
  largeEmployer?: boolean;
  existingLenderRelationship?: boolean;
  offersReceived?: { rate: number; amount: number }[];
  /** high-cost informal/app-loan balances outstanding (APR > 28%) */
  highCostDebtOutstanding?: number;
}

export type Confidence = 'low' | 'medium' | 'high';

export interface Range {
  low: number;
  high: number;
  point: number;
}

export interface IncomeAssessment {
  assessedMonthlyIncome: number;
  confidence: Confidence;
  notes: string[];
}

export interface Obligations {
  total: number;
  breakdown: { label: string; amount: number }[];
  highCostDebt: number;
}

export interface RateResult {
  product: ProductId;
  nominalBand: Range;      // percent p.a.
  aprBand: Range;          // percent p.a. all-in
  notes: string[];
}

export type Verdict = 'borrow' | 'borrow_less' | 'do_not_borrow';

export interface StressCase {
  label: string;
  scenario: string;
  foir: number;
  outcome: 'comfortable' | 'tight' | 'breaks';
  detail: string;
}

export interface Assessment {
  income: IncomeAssessment;
  obligations: Obligations;
  product: ProductId;
  productLabel: string;
  routingWhy: string;

  confidence: Confidence;
  missingAnswers: { field: string; wouldDo: string }[];
  assumptionsUsed: string[];

  /** O1 */
  verdict: {
    call: Verdict;
    headline: string;
    why: string;
    constructivePath?: string[];
  };

  /** O2 */
  maxAmount: {
    lenderWillSanction: Range;
    borrowerCanCarry: Range;
    useThis: 'lender' | 'borrower';
    amount: Range;
    why: string;
  };

  /** O3 */
  rate: RateResult;

  /** O4 */
  outflow: {
    emiCeiling: Range;
    atRecommendedAmount: {
      amount: number;
      prudent: { tenureMonths: number; emi: number; totalInterest: number };
      maximum: { tenureMonths: number; emi: number; totalInterest: number };
    };
    stress: StressCase[];
    why: string;
  };

  /** Negotiation Card - the one screen to hold up to a lender */
  card: {
    product: string;
    amount: string;
    fairRate: string;
    fairApr: string;
    emiCeiling: string;
    tenure: string;
    walkAwayLine: string;
    bullets: string[];
  };
}
