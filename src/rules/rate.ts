import { apr, clamp, emi } from './finance';
import { GST_ON_FEES, LENDER_TIER, PRODUCTS, RATE_ADJ, type ProductId } from './config';
import type { Answers, Confidence, LenderTier, RateResult, Range } from './types';

/**
 * §6.2 - which lender archetype will realistically price this borrower, and so
 * which of the product's two bands applies. An unknown credit score is NOT a
 * demotion here (it widens the band elsewhere); only a KNOWN weak score, a
 * genuine thin file, or informal income moves a borrower to the NBFC band.
 *
 * Property-backed lending (home, LAP) is the one place banks will still
 * underwrite a weak or thin file - the asset carries it - so it stays
 * bank-tier unless the score is known and genuinely low. Small-ticket secured
 * lending (gold, two-wheeler) does NOT get an informal or thin-file borrower
 * into a bank branch in practice - NBFCs and captive financiers own that
 * segment - so it uses the same bankability test as unsecured.
 */
function lenderTier(a: Answers, product: ProductId, notes: string[]): LenderTier {
  const score = a.creditScoreKnown ? a.creditScore : undefined;
  const thinFile = a.neverBorrowed === true;
  const informal = a.incomeType === 'informal';
  const propertyBacked = product === 'home' || product === 'lap';

  if (propertyBacked) {
    if (score !== undefined && score < LENDER_TIER.securedFloorScore) {
      notes.push(
        `Priced at NBFC / fintech rates: a known score of ${score} is below what most banks accept even against property. Improving the score to ${LENDER_TIER.securedFloorScore}+ opens bank-tier pricing.`,
      );
      return 'nbfc';
    }
    notes.push('Priced at bank-tier rates: banks dominate property-backed lending and will lend against a sound asset even on a thin file.');
    return 'bank';
  }

  const reasons: string[] = [];
  if (thinFile) reasons.push('there is no credit history to underwrite');
  if (informal) reasons.push('the income is informal / undocumented');
  if (score !== undefined && score < LENDER_TIER.bankMinScore) reasons.push(`the credit score (${score}) is below the bank cut-off`);

  if (reasons.length > 0) {
    notes.push(
      `Priced at NBFC / fintech rates: a scheduled bank is unlikely to sanction this loan because ${reasons.join(
        ' and ',
      )}. An NBFC or captive financier will, at a premium. Twelve months of ITR or salary slips, a co-applicant with formal income, or property to pledge (a LAP) moves you to bank-tier pricing.`,
    );
    return 'nbfc';
  }
  notes.push('Priced at bank-tier rates: the profile is one a scheduled bank would underwrite.');
  return 'bank';
}

/** How many of the rate-relevant additional questions were answered (0..1). */
function rateAnswerCompleteness(a: Answers): number {
  const relevant: (keyof Answers)[] = [
    'creditScoreKnown',
    'yearsInJobOrTrade',
    'largeEmployer',
    'existingLenderRelationship',
    'incomeEvidence',
  ];
  const answered = relevant.filter((k) => a[k] !== undefined).length;
  return answered / relevant.length;
}

/**
 * §6.1 - where in the band this borrower lands, expressed as a POSITION `t` in
 * [0,1] (0 = band floor / best price, 1 = band ceiling / worst price). A wide
 * product band like personal loans (10.5–24%) can't be priced by small point
 * nudges off the midpoint - the score has to be able to move you most of the way
 * to the floor. Each factor shifts `t`; the shifts are the "why".
 */
function pricePosition(a: Answers, secured: boolean, notes: string[]): number {
  const P = RATE_ADJ.pos;
  let t = 0.5;

  if (a.creditScoreKnown && a.creditScore !== undefined) {
    const s = a.creditScore;
    const d = (P.score.find((b) => s >= b.min) ?? P.score[P.score.length - 1]).shift;
    t += d;
    notes.push(
      d < 0
        ? `Score ${s}: near the best-priced end of this product's range.`
        : d === 0
          ? `Score ${s}: mid-range pricing.`
          : `Score ${s}: sub-prime - priced toward the top of the range.`,
    );
  } else if (a.neverBorrowed) {
    // genuine thin file - never taken a formal loan, so no score exists
    t += secured ? P.thinFileSecured : P.thinFileUnsecured;
    notes.push(
      secured
        ? `No credit score because you have never borrowed - but the loan is secured, so the collateral prices it and the premium is small.`
        : `Never borrowed formally, so there is no history to price: a real premium on an unsecured loan. A secured loan sidesteps this.`,
    );
  } else {
    // has borrowed before but hasn't checked / doesn't recall the score
    notes.push(
      `Credit score unknown: band widened ±${RATE_ADJ.scoreUnknownWiden} pts, centre held at the middle of the range - not penalised as if it were a low score. Check it free before you borrow; a good score pulls the rate down.`,
    );
  }

  if (a.largeEmployer) {
    t += P.largeEmployer;
    notes.push('Large / listed / government employer: a small discount.');
  }
  if (a.incomeType === 'self_employed' && !secured) {
    t += P.selfEmployedUnsecured;
    notes.push('Self-employed on an unsecured loan: income-verification premium.');
  }
  if (a.incomeType === 'informal' && !secured) {
    t += P.informalUnsecured;
    notes.push('Informal income on an unsecured loan: a large premium - or pledge an asset and re-price.');
  }
  if (a.existingLenderRelationship) {
    t += P.existingRelationship;
    notes.push('Existing lender relationship / salary account: a small discount.');
  }
  if (a.loanIsProductive) {
    notes.push(
      'This loan is productive - that strengthens the verdict on whether to borrow, but a lender still prices risk, not your business plan, so it does not move the quoted rate.',
    );
  }

  return clamp(t, 0, 1);
}

/**
 * §6.1 + §7 - final rate band and the all-in APR of it.
 */
export function assessRate(
  a: Answers,
  productId: ProductId,
  principalForApr: number,
  tenureMonths: number,
  confidence: Confidence,
): RateResult {
  const p = PRODUCTS[productId];
  const notes: string[] = [];

  const tier = lenderTier(a, productId, notes);
  const [bandLo, bandHi] = p.rateByTier[tier];
  const span = bandHi - bandLo;

  const t = pricePosition(a, p.secured, notes);
  const centre = bandLo + t * span;

  // Residual uncertainty half-width (percentage points): shrinks with answers.
  const completeness = rateAnswerCompleteness(a);
  const { min, max } = RATE_ADJ.residualUncertainty;
  let half = max - (max - min) * completeness;
  if (!a.creditScoreKnown) half = Math.max(half, RATE_ADJ.scoreUnknownWiden);
  if (confidence === 'low') half = Math.max(half, 2.0);

  const nominalBand: Range = {
    low: clamp(centre - half, bandLo, bandHi),
    high: clamp(centre + half, bandLo, bandHi),
    point: centre,
  };

  // §7 - all-in APR at each end of the band
  const feeMid = (p.fee[0] + p.fee[1]) / 2;
  const upfrontFees =
    principalForApr * feeMid * (1 + GST_ON_FEES) +
    p.flatFee * (1 + GST_ON_FEES) +
    principalForApr * p.bundledInsurance;

  const aprAt = (ratePct: number) =>
    apr(principalForApr, upfrontFees, emi(principalForApr, ratePct, tenureMonths), tenureMonths);

  const aprBand: Range = {
    low: aprAt(nominalBand.low),
    high: aprAt(nominalBand.high),
    point: aprAt(nominalBand.point),
  };

  notes.push(
    `All-in APR folds in a ~${(feeMid * 100).toFixed(2)}% processing fee + 18% GST on it` +
      (p.bundledInsurance
        ? ` + ${(p.bundledInsurance * 100).toFixed(1)}% single-premium loan insurance (often optional - refuse it and the APR drops close to the nominal rate)`
        : '') +
      `. A quote whose APR is more than ~1.5 pts above the top of this band is a markup worth challenging.`,
  );

  return { product: productId, lenderTier: tier, nominalBand, aprBand, notes };
}
