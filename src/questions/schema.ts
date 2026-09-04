import type { Answers } from '../rules/types';

/**
 * The question set. Two tiers:
 *  - tier 'must' - the 8–10 questions needed to produce all four outputs.
 *  - tier 'additional' - each one must change an output. `movesOutput` says which.
 *
 * `show(a)` is the adaptive gate: a salaried IT employee and a kirana owner do
 * not see the same list. A question that cannot change any output for THIS
 * borrower is not asked.
 */

export type FieldType = 'number' | 'money' | 'select' | 'boolean' | 'percent';

export interface Choice {
  value: string;
  label: string;
}

export interface Question {
  id: keyof Answers;
  tier: 'must' | 'additional';
  label: string;
  help?: string;
  type: FieldType;
  choices?: Choice[];
  /** which output(s) this moves - shown to the borrower */
  movesOutput?: string;
  /** adaptive visibility */
  show?: (a: Answers) => boolean;
  /** default shown as placeholder / assumption note if skipped */
  skipNote?: string;
  min?: number;
  max?: number;
}

const isSelfEmployed = (a: Answers) => a.incomeType === 'self_employed';
const isInformal = (a: Answers) => a.incomeType === 'informal';
const isSalaried = (a: Answers) => a.incomeType === 'salaried';
const isBusiness = (a: Answers) => a.purpose === 'business_expansion' || a.purpose === 'working_capital';
const isVehicle = (a: Answers) => a.purpose === 'vehicle';
const bigAsk = (a: Answers) => (a.amountWanted ?? 0) >= 500000;

export const QUESTIONS: Question[] = [
  // ─────────────────────────── MUST ───────────────────────────
  {
    id: 'purpose',
    tier: 'must',
    label: 'What is the loan for?',
    type: 'select',
    movesOutput: 'O1 verdict, product routing',
    choices: [
      { value: 'home_purchase', label: 'Buying / building a home' },
      { value: 'home_renovation', label: 'Home renovation' },
      { value: 'business_expansion', label: 'Growing a business (stock, equipment, premises)' },
      { value: 'working_capital', label: 'Business working capital / cash flow' },
      { value: 'vehicle', label: 'A vehicle' },
      { value: 'wedding', label: 'A wedding' },
      { value: 'medical_elective', label: 'Planned medical expense' },
      { value: 'education', label: 'Education' },
      { value: 'travel', label: 'Travel' },
      { value: 'consumer_durable', label: 'Appliance / phone / furniture' },
      { value: 'debt_consolidation_lifestyle', label: 'Paying off other loans / cards' },
      { value: 'other_consumption', label: 'Something else personal' },
    ],
  },
  {
    id: 'amountWanted',
    tier: 'must',
    label: 'How much do you want to borrow?',
    type: 'money',
    movesOutput: 'O1 verdict, O2 amount',
  },
  {
    id: 'incomeType',
    tier: 'must',
    label: 'How do you earn?',
    type: 'select',
    movesOutput: 'every output - sets the whole assessment path',
    choices: [
      { value: 'salaried', label: 'Salaried (regular pay from an employer)' },
      { value: 'self_employed', label: 'Self-employed with an ITR (business, professional)' },
      { value: 'informal', label: 'Informal / cash / gig / no ITR' },
    ],
  },
  {
    id: 'netMonthlyIncome',
    tier: 'must',
    label: (undefined as unknown) as string, // set below by variant
    type: 'money',
    movesOutput: 'O2 amount, O4 EMI ceiling',
  },
  {
    id: 'cashIncomeLow',
    tier: 'must',
    label: 'In a WEAK month, what do you actually take home?',
    help: 'We plan on this number, not the good months.',
    type: 'money',
    movesOutput: 'O2 amount, O4 EMI ceiling',
    show: (a) => isInformal(a) || isSelfEmployed(a),
  },
  {
    id: 'existingEmiTotal',
    tier: 'must',
    label: 'Total of all EMIs you already pay each month',
    help: 'Car, home, personal, consumer - everything with a fixed monthly instalment. Enter 0 if none.',
    type: 'money',
    movesOutput: 'O2 amount, O4 EMI ceiling, O1 verdict',
  },
  {
    id: 'monthlyHouseholdExpenses',
    tier: 'must',
    label: 'Roughly what does your household spend each month to run?',
    help: 'Food, utilities, school fees, transport, rent is asked separately. A rough figure is fine.',
    type: 'money',
    movesOutput: 'O2 amount (borrower-can-carry), O4',
    skipNote: 'Skipped → we use a subsistence floor for your dependents (conservative).',
  },
  {
    id: 'rentPaid',
    tier: 'must',
    label: 'Monthly rent you pay (0 if you own / live with family)',
    type: 'money',
    movesOutput: 'O2 amount (borrower-can-carry), O4',
    show: (a) => a.purpose !== 'home_purchase',
    skipNote: 'Skipped → assumed ₹0 rent. If you rent, answer this - it directly lowers what you can carry.',
  },
  {
    id: 'age',
    tier: 'must',
    label: 'Your age',
    type: 'number',
    movesOutput: 'O4 (maximum tenure the lender allows)',
    min: 18,
    max: 75,
  },
  {
    id: 'dependents',
    tier: 'must',
    label: 'How many people depend on your income?',
    help: 'Count anyone who does not earn - children, non-earning spouse, parents.',
    type: 'number',
    movesOutput: 'O2 amount (subsistence floor), O4',
    min: 0,
    max: 12,
  },
  {
    id: 'creditScoreKnown',
    tier: 'must',
    label: 'Do you know your credit score (CIBIL / Experian)?',
    type: 'boolean',
    movesOutput: 'O3 rate',
  },
  {
    id: 'creditScore',
    tier: 'must',
    label: 'What is it, roughly?',
    type: 'number',
    movesOutput: 'O3 rate',
    show: (a) => a.creditScoreKnown === true,
    min: 300,
    max: 900,
  },
  {
    id: 'neverBorrowed',
    tier: 'must',
    label: 'Have you ever taken a formal loan from a bank or NBFC?',
    help: 'Different from not knowing your score: this means no credit history exists at all.',
    type: 'boolean',
    movesOutput: 'O3 rate (thin-file handling)',
    show: (a) => a.creditScoreKnown === false,
    skipNote: 'Skipped → treated as "score unknown", not as a thin file.',
  },

  // ───────────────────────── ADDITIONAL ─────────────────────────
  {
    id: 'yearsInJobOrTrade',
    tier: 'additional',
    label: 'How many years in this job / trade?',
    type: 'number',
    movesOutput: 'O2 amount + O3 rate - longer history lowers the income haircut and the rate',
    min: 0,
    max: 50,
  },
  {
    id: 'largeEmployer',
    tier: 'additional',
    label: 'Is your employer large, listed, or government?',
    type: 'boolean',
    movesOutput: 'O3 rate - about 0.5 points',
    show: isSalaried,
  },
  {
    id: 'variablePayShareOfIncome',
    tier: 'additional',
    label: 'What share of your take-home is variable (incentive / bonus / commission)?',
    type: 'percent',
    movesOutput: 'O2 amount - variable pay is counted at half, or not at all under 2 years',
    show: isSalaried,
  },
  {
    id: 'incomeEvidence',
    tier: 'additional',
    label: 'What can you show for your cash income beyond the ITR?',
    type: 'select',
    movesOutput: 'O2 amount - raises how much of your cash income counts',
    show: isSelfEmployed,
    choices: [
      { value: 'none', label: 'Nothing beyond the ITR' },
      { value: 'bankStatements', label: '12 months of bank statements' },
      { value: 'gst', label: 'GST returns' },
    ],
  },
  {
    id: 'cashIncomeHigh',
    tier: 'additional',
    label: 'In a GOOD month, what do you take home?',
    type: 'money',
    movesOutput: 'confidence - a wide swing widens every range',
    show: (a) => isInformal(a) || isSelfEmployed(a),
  },
  {
    id: 'cardOutstanding',
    tier: 'additional',
    label: 'Total outstanding on your credit cards right now',
    type: 'money',
    movesOutput: 'O2 amount + O1 - replaces an assumed 50%-utilisation obligation',
  },
  {
    id: 'cardLimit',
    tier: 'additional',
    label: 'Total credit-card limit across all cards',
    type: 'money',
    movesOutput: 'O2 amount - used only if you skip the balance above',
    show: (a) => a.cardOutstanding === undefined,
  },
  {
    id: 'pastBounces12m',
    tier: 'additional',
    label: 'Bounced or missed payments in the last 12 months',
    type: 'number',
    movesOutput: 'O1 verdict + confidence',
    min: 0,
    max: 24,
  },
  {
    id: 'bounceWithin3m',
    tier: 'additional',
    label: 'Any of those in the last 3 months?',
    type: 'boolean',
    movesOutput: 'O1 verdict - a fresh bounce can flip this to "don\'t borrow"',
    show: (a) => (a.pastBounces12m ?? 0) > 0,
  },
  {
    id: 'emergencySavingsMonths',
    tier: 'additional',
    label: 'How many months of expenses could you cover from savings if income stopped?',
    type: 'number',
    movesOutput: 'O2 amount + O1 - a real buffer unlocks capacity we otherwise protect',
    min: 0,
    max: 60,
  },
  {
    id: 'highCostDebtOutstanding',
    tier: 'additional',
    label: 'Outstanding on app loans / informal loans charging over ~28%',
    type: 'money',
    movesOutput: 'O1 verdict - a large high-cost balance blocks new unsecured debt',
    show: (a) => isInformal(a) || a.purpose === 'debt_consolidation_lifestyle',
  },
  {
    id: 'collateralType',
    tier: 'additional',
    label: 'Do you own an asset you could pledge?',
    type: 'select',
    movesOutput: 'product routing + O2 + O3 - a secured loan is roughly half the rate',
    show: (a) => isBusiness(a) || bigAsk(a),
    choices: [
      { value: 'none', label: 'No' },
      { value: 'residential', label: 'Residential property' },
      { value: 'commercial', label: 'Commercial / shop property' },
      { value: 'gold', label: 'Gold' },
    ],
  },
  {
    id: 'collateralValue',
    tier: 'additional',
    label: 'Roughly what is that asset worth?',
    type: 'money',
    movesOutput: 'O2 amount - sets the secured ceiling via loan-to-value',
    show: (a) => !!a.collateralType && a.collateralType !== 'none',
  },
  {
    id: 'collateralEncumbered',
    tier: 'additional',
    label: 'Is there already a loan against it?',
    type: 'boolean',
    movesOutput: 'product routing - an encumbered asset cannot be pledged again here',
    show: (a) => !!a.collateralValue && a.collateralValue > 0,
  },
  {
    id: 'coApplicant',
    tier: 'additional',
    label: 'Will someone with an income apply jointly with you?',
    type: 'boolean',
    movesOutput: 'O2 amount - a second income raises both ceilings',
  },
  {
    id: 'coApplicantIncome',
    tier: 'additional',
    label: "Co-applicant's net monthly income",
    type: 'money',
    movesOutput: 'O2 amount',
    show: (a) => a.coApplicant === true,
  },
  {
    id: 'coApplicantDocumented',
    tier: 'additional',
    label: "Is the co-applicant's income documented (salary slips / ITR)?",
    type: 'boolean',
    movesOutput: 'O2 amount - undocumented income is counted at half',
    show: (a) => a.coApplicant === true,
  },
  {
    id: 'upcomingLargeExpense',
    tier: 'additional',
    label: 'Any large expense you already know is coming in the next year?',
    help: 'School admission, a medical procedure, a family event. Enter the amount, or 0.',
    type: 'money',
    movesOutput: 'O2 amount (borrower-can-carry)',
  },
  {
    id: 'loanIsProductive',
    tier: 'additional',
    label: 'Will this loan directly earn you money?',
    help: 'A delivery vehicle, stock to sell, a tool of trade - versus a wedding or a holiday.',
    type: 'boolean',
    movesOutput: 'O1 verdict + product routing (e.g. EV scheme for a work vehicle)',
    show: (a) => isVehicle(a) || isBusiness(a),
  },
  {
    id: 'expectedMonthlyReturnFromLoan',
    tier: 'additional',
    label: 'Roughly how much extra will this bring in or save you each month?',
    help: 'What the vehicle, stock, or equipment is expected to earn or save, net of running costs. A rough figure is fine.',
    type: 'money',
    movesOutput: 'a separate check: does this loan pay for its own EMI? Shown alongside O1, never added to income.',
    show: (a) => a.loanIsProductive === true,
  },
  {
    id: 'existingLenderRelationship',
    tier: 'additional',
    label: 'Do you already bank with, or have a loan with, a lender you would approach?',
    type: 'boolean',
    movesOutput: 'O3 rate - about 0.25 points',
  },
];

/** Must-questions visible for the current answers. */
export function visibleQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.show || q.show(a));
}

/** Label variant for the income field, which reads differently per income type. */
export function incomeFieldLabel(a: Answers): string {
  if (a.incomeType === 'self_employed') return 'Monthly income as shown on your latest ITR';
  if (a.incomeType === 'informal') return 'What do you take home in a TYPICAL month?';
  return 'Your net monthly take-home salary';
}
