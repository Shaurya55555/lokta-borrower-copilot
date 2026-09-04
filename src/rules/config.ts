/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE ONE FILE TO CHANGE.
 *  Every rule, threshold, band and assumption the Borrower Copilot uses.
 *  Mirrors RULES.md section for section. No logic here - only numbers and the
 *  short "why" that justifies each. Change a value here and every output, range
 *  and Negotiation Card moves with it.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type ProductId =
  | 'home'
  | 'lap'
  | 'personal'
  | 'business_unsecured'
  | 'gold'
  | 'two_wheeler'
  | 'ev_two_wheeler';

export interface ProductBand {
  id: ProductId;
  label: string;
  secured: boolean;
  /** nominal annual rate band, percent */
  rate: [number, number];
  /** processing fee as fraction of principal */
  fee: [number, number];
  /** flat add-on fee in rupees (e.g. two-wheeler docs) */
  flatFee: number;
  /** tenure in months: [prudent default, product maximum] */
  tenureMonths: [number, number];
  /** single-premium bundled insurance as fraction of principal (0 = none) */
  bundledInsurance: number;
}

/** §6 - Interest-rate bands. Indicative Indian retail market, 2026. My judgement,
 *  informed by public SBI / HDFC / Bajaj / Muthoot rate cards. */
export const PRODUCTS: Record<ProductId, ProductBand> = {
  home: {
    id: 'home', label: 'Home loan', secured: true,
    rate: [8.4, 9.75], fee: [0.0025, 0.005], flatFee: 0,
    tenureMonths: [180, 360], bundledInsurance: 0,
  },
  lap: {
    id: 'lap', label: 'Loan against property (LAP)', secured: true,
    rate: [9.5, 12.0], fee: [0.005, 0.015], flatFee: 0,
    tenureMonths: [120, 180], bundledInsurance: 0,
  },
  personal: {
    id: 'personal', label: 'Personal loan', secured: false,
    rate: [10.5, 24.0], fee: [0.01, 0.03], flatFee: 0,
    tenureMonths: [36, 72], bundledInsurance: 0.01,
  },
  business_unsecured: {
    id: 'business_unsecured', label: 'Business loan (unsecured)', secured: false,
    rate: [15.0, 26.0], fee: [0.02, 0.03], flatFee: 0,
    tenureMonths: [36, 60], bundledInsurance: 0.008,
  },
  gold: {
    id: 'gold', label: 'Gold loan', secured: true,
    rate: [9.0, 18.0], fee: [0.0025, 0.015], flatFee: 0,
    tenureMonths: [12, 36], bundledInsurance: 0,
  },
  two_wheeler: {
    id: 'two_wheeler', label: 'Two-wheeler loan', secured: true,
    rate: [9.5, 22.0], fee: [0.01, 0.03], flatFee: 3000,
    tenureMonths: [36, 60], bundledInsurance: 0.008,
  },
  ev_two_wheeler: {
    id: 'ev_two_wheeler', label: 'EV two-wheeler loan (green scheme)', secured: true,
    rate: [7.0, 12.0], fee: [0.01, 0.02], flatFee: 3000,
    tenureMonths: [36, 60], bundledInsurance: 0.008,
  },
};

/** GST on financial-service fees (§7). */
export const GST_ON_FEES = 0.18;

/** Loan-to-value ceilings for secured routing (§5). Fraction of collateral value. */
export const LTV: Record<string, number> = {
  home: 0.8,        // RBI: 80% above ₹30L (75% above ₹75L) - simplified
  lap_residential: 0.65,
  lap_commercial: 0.55,
  gold: 0.75,       // RBI gold-loan LTV cap
  vehicle: 0.85,
};

/** §1 - Income assessment. */
export const INCOME = {
  /** self-employed: how much of (cash − ITR) counts, by evidence level */
  cashUpliftFactor: { none: 0.35, bankStatements: 0.5, gst: 0.65 },
  /** informal: fraction of the LOW end of the stated range that counts */
  informalHaircut: { default: 0.6, established: 0.7 }, // established = >=3 yrs
  /** co-applicant income clubbing */
  coApplicantShare: { undocumented: 0.5, documented: 1.0 },
  /** salaried: share of average variable pay counted, if >=2 yrs history */
  variablePayShare: 0.5,
  /** range width (as fraction of midpoint) above which AMI confidence is capped low */
  rangeWidthLowConfidence: 0.4,
};

/** §3 - FOIR ceilings (lender side), by assessed monthly income. */
export const FOIR_BANDS: { upTo: number; ceiling: number }[] = [
  { upTo: 25000, ceiling: 0.4 },
  { upTo: 50000, ceiling: 0.45 },
  { upTo: 100000, ceiling: 0.5 },
  { upTo: Infinity, ceiling: 0.55 },
];
export const FOIR_SECURED_BONUS = 0.05;   // collateral lets lenders tolerate more
export const FOIR_INFORMAL_CAP = 0.45;    // hard cap for informal income, any amount

/** §2 - Existing obligations. */
export const OBLIGATIONS = {
  cardMinDueRate: 0.05,          // RBI ~5% minimum due
  assumedCardUtilisation: 0.5,  // when balance unknown but card held
  highCostAprThreshold: 28,     // above this = "high-cost debt", drives verdict
};

/** §4 - Borrower affordability deductions. */
export const AFFORDABILITY = {
  subsistenceBase: 10000,          // ₹ / month, single person
  subsistencePerDependent: 6000,   // ₹ / month each
  emergencySavingsRate: 0.1,       // protect 10% of AMI as savings...
  emergencySavingsWaiverMonths: 6, // ...unless they already hold >= 6 months of expenses
  volatilityBuffer: { salaried: 0.0, self_employed: 0.1, informal: 0.15 },
  /** non-productive loans: new EMI also capped at this share of net income */
  consumptionEmiCapOfIncome: 0.2,
};

/** §5 - purposes treated as non-productive (triggers the consumption cap). */
export const NON_PRODUCTIVE_PURPOSES = [
  'wedding', 'travel', 'consumer_durable', 'medical_elective', 'debt_consolidation_lifestyle', 'other_consumption',
];

/** unsecured ask above this multiple of monthly AMI → recommend secured if collateral exists */
export const UNSECURED_ASK_INCOME_MULTIPLE = 15;

/** §6.1 - rate adjustments (percentage points), applied to band midpoint. */
export const RATE_ADJ = {
  score: [
    { min: 800, adj: -2.0 },
    { min: 750, adj: -1.0 },
    { min: 700, adj: 0.0 },
    { min: 650, adj: +2.5 },
    { min: 0, adj: +4.0 },
  ],
  scoreUnknownWiden: 2.0,      // ± around midpoint, no centre penalty
  thinFileSecured: +0.5,
  thinFileUnsecured: +3.0,
  largeEmployer: -0.5,
  selfEmployedUnsecured: +1.5,
  informalUnsecured: +3.0,
  existingRelationship: -0.25,
  /** O3 half-width: shrinks as additional questions are answered */
  residualUncertainty: { min: 0.75, max: 3.0 },
};

/** §8 - verdict thresholds. */
export const VERDICT = {
  freshBounceMonths: 3,
  freshBounceFoir: 0.5,
  expensiveDebtIncomeMultiple: 1.0,
  stressHardFoir: 0.7,
  thinBufferFoir: 0.55,
  thinBufferSavingsMonths: 1,
  borrowLessOvershoot: 0.1,     // requested > safe by >10% → borrow less
  borrowLessSavingsMonths: 2,
  borrowAsRequestedStressFoir: 0.6,
};

/** §9 - stress cases. */
export const STRESS = {
  incomeDropFactor: 0.8,
  rateRisePts: 2.0,
  rateRiseWorstPts: 3.0,
  verdictBands: { comfortable: 0.5, tight: 0.65 }, // FOIR below → label
};

/** §10 - confidence → output band width. */
export const CONFIDENCE = {
  amountBandHalfWidth: { low: 0.25, medium: 0.15, high: 0.08 },
};

/** §11 - defaults for unanswered questions (all conservative). */
export const DEFAULTS = {
  emergencySavingsMonths: 0,
  pastBounces: 0,
  coApplicantIncome: 0,
  collateralValue: 0,
  upcomingLargeExpense: 0,
  cardUtilisation: 0.5,
};

/** display rounding */
export const ROUND = { principal: 1000, emi: 100 };
