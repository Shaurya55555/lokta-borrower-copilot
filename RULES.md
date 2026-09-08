# RULES.md - Borrower Copilot

Every rule, threshold, band and assumption the app uses to produce its four
outputs. Format: **what · value · why · source**. "Source" is either a real
market/regulatory reference or **"my judgement"** where I set a number myself.

The app is a **self-assessment**, not a credit model. It never pulls a bureau
report, never stores personal data, and runs entirely in the browser. Its job
is to make the borrower the best-informed person in the room.

Everything below lives in code in **one file**: `src/rules/config.ts`. Change a
number there and the whole app - outputs, ranges, the Negotiation Card - moves
with it. This document mirrors that file section for section.

> **India, in rupees.** All money is INR. Affordability is FOIR-style. Rate
> disclosure is RBI-style all-in APR (interest + fees). Rate bands are indicative
> of the Indian retail market in 2026; they are my judgement calls informed by
> published lender rate cards, not a live feed. The app says so on screen.

---

## 0. Reading guide - how a number becomes an output

```
answers
  ├─► assessed monthly income (AMI)        §1 - what we believe they actually earn
  ├─► existing obligations                 §2 - what is already committed
  ├─► LENDER ceiling  = FOIR math          §3 - what a lender will likely sanction
  ├─► BORROWER ceiling = affordability     §4 - what they can safely carry
  ├─► product routing                      §5 - which loan this should even be
  ├─► lender tier (bank vs NBFC band)      §6.2
  ├─► rate band + all-in APR               §6.1, §7
  ├─► verdict (borrow / less / don't)      §8
  ├─► EMI ceiling + tenure + stress        §9
  └─► confidence + defaults for silence    §10,§11
```

O2 (Maximum amount) reports the **lender** number and the **borrower** number
side by side and tells the borrower to use the **lower** one. That gap is the
whole point of the product.

---

## 1. Income - what we believe they actually earn

We never take stated income at face value for non-salaried borrowers. We compute
an **Assessed Monthly Income (AMI)** and a **confidence** on it.

| What | Value | Why | Source |
|---|---|---|---|
| Salaried AMI | = net (take-home) monthly salary | Take-home is what services an EMI; gross overstates it | Standard lender practice |
| Salaried - variable pay | Count fixed only. Add 50% of average variable **if** ≥ 2 years history stated | Bonuses are not guaranteed; lenders discount them | My judgement, aligned with typical bank policy |
| Self-employed AMI | = monthly ITR income + `cashUpliftFactor` × (stated cash income − ITR income) | ITR is the defensible floor; undeclared cash is real but must be haircut | My judgement |
| `cashUpliftFactor` | **0.35** with no proof · **0.50** if bank statements shown · **0.65** if GST returns shown | Rewards evidence, stays conservative without it | My judgement |
| Informal AMI | = **low end** of stated income range × `informalHaircut` | Informal income is volatile and unverifiable; plan for a bad month | My judgement |
| `informalHaircut` | **0.60** (0.70 if ≥ 3 years on same platform/trade) | ~1 in 3 rupees treated as not dependable | My judgement |
| Co-applicant / spouse income | Add **50%** if informal/undocumented · **100%** if salaried with proof | Clubbing is standard for eligibility; haircut the unverifiable half | Standard lender practice + my judgement |
| Range inputs (e.g. "₹40–80k") | Always use the **low end** for AMI; use the spread to widen confidence | Never narrow a range we have no basis to narrow (brief rule 2) | Brief |
| Income **type** unknown | Treat as informal | Conservative default | My judgement |

**Confidence on AMI:** `high` salaried-with-proof · `medium` self-employed-with-ITR
· `low` informal or range width > 40% of midpoint.

---

## 2. Existing obligations - what is already committed

FOIR numerator = sum of everything below.

| What | Value | Why | Source |
|---|---|---|---|
| Existing loan EMIs | As stated, summed | Directly reduce repayment capacity | Definitional |
| Credit-card dues | **5%** of stated outstanding balance per month | ~5% is the minimum-due figure most Indian card issuers quote; treated as the recurring obligation | Industry convention / my judgement (not a cited RBI percentage - do not claim RBI mandates 5% specifically) |
| Card outstanding unknown but card held | Assume **50%** utilisation of stated limit; if limit unknown, ₹0 and cap confidence | "Unknown is never zero" for risk, but don't invent a number we can't bound | Brief rule 3 + my judgement |
| Loans ending within 6 months | Still counted at full EMI | Sanction happens now; the obligation is still live | My judgement |
| Informal / app-loan repayments | Counted; flagged separately as **high-cost debt** if APR > 28% | These crowd out capacity fastest and change the verdict | My judgement |
| "High-cost debt" threshold | APR > **28%** | Above typical unsecured bank ceiling; signals distress borrowing | My judgement |

---

## 3. LENDER ceiling - FOIR / what a lender will likely sanction

**FOIR** (Fixed Obligation to Income Ratio) = (existing obligations + new EMI) ÷
income. A lender sanctions up to a FOIR ceiling that rises with income.

| Monthly income band (AMI) | FOIR ceiling | Why | Source |
|---|---|---|---|
| < ₹25,000 | **40%** | Little slack after essentials at low income | My judgement, aligned with lender FOIR grids |
| ₹25,000 – ₹50,000 | **45%** | | |
| ₹50,000 – ₹1,00,000 | **50%** | | |
| > ₹1,00,000 | **55%** | High earners can commit a larger share and still live | Common lender practice |
| Secured loan (home/LAP/gold/vehicle) | **+5 percentage points** to the band ceiling | Collateral lets lenders tolerate higher FOIR | Common lender practice |
| Informal income (any amount) | **Hard cap 45%**, and computed on the haircut AMI | Volatility risk; regulators and lenders both lean conservative here | My judgement |
| Co-applicant present | Ceiling applies to combined income | Clubbing | Standard |

**Lender max new EMI** = `FOIRceiling × AMI − existingObligations`
(floored at 0).

**Lender max principal** = present value of that EMI stream at the **expected
rate** for the routed product - the midpoint of whichever tier band applies to
this borrower (§6.2) - over the **maximum tenure the product allows** (§9). This
is deliberately the optimistic end - it is what a lender *could* stretch to, not
what the borrower *should* take.

---

## 4. BORROWER ceiling - what they can safely carry

Same borrower, a stricter test. Start from AMI and subtract everything that
actually leaves the bank account each month, then see what is left for a new EMI.

| Deduction | Value | Why | Source |
|---|---|---|---|
| Existing obligations | §2 total | Already committed | Definitional |
| Rent | As stated, **if** renting and the loan is not for a home they will move into | A renter's ₹28k is gone monthly; FOIR ignores it, a household budget cannot | My judgement |
| Household / living expenses | `max(stated, subsistenceFloor)` | People under-report expenses; never let the floor be crossed | My judgement |
| `subsistenceFloor` | **₹10,000 + ₹6,000 per dependent** (spouse counts if not earning) | Rough urban/semi-urban essentials per NSSO-style consumption bands | My judgement, order-of-magnitude from NSSO HCES 2022–23 |
| Emergency-savings contribution | **10%** of AMI, protected, **unless** stated emergency savings ≥ 6 months of expenses | A borrower with no buffer who stops saving to pay an EMI is one shock from default | My judgement |
| Income-volatility buffer | **0%** salaried · **10%** self-employed · **15%** informal, of AMI | Non-salaried need a cushion for the bad month the average hides | My judgement |
| Consumption-loan prudence cap | New EMI additionally capped at **20% of net income** when the loan purpose is **non-productive**: wedding, travel, consumer durable, planned medical, debt-funded lifestyle, other personal (`NON_PRODUCTIVE_PURPOSES` in `config.ts`) | A discretionary want should not command more than a fifth of take-home; keeps the borrower liquid | My judgement |

**Borrower safe new EMI** = `AMI − (all deductions above)`, then apply the
consumption cap if it bites. Floored at 0.

**Borrower safe principal** = present value of the safe EMI at the **expected
rate**, over a **prudent tenure** (§9) - not the maximum. Shorter tenure = less
interest paid, and the app defaults to it.

**The number the borrower should use** = `min(lender safe principal, borrower
safe principal)`. The app always names which one is binding and why, in one
sentence.

---

## 5. Product routing - which loan this should even be

Route on **purpose + assets + amount**, before any pricing.

| Situation | Routed product | Why | Source |
|---|---|---|---|
| Buying / building / renovating a home | **Home loan** | Cheapest secured money; purpose-locked | Market |
| Business / working capital **and** owns unencumbered property | **LAP**, capped at the property's LTV - *not* unsecured | This is the Ravi case: collateral should do the talking, not a score he doesn't have | My judgement + brief scoring note |
| Business / working capital, **no** collateral | Unsecured business loan (small ticket, high rate); if property exists the app says "add it and re-run" | Only option without an asset; app must show how small and how expensive | Market |
| Vehicle purchase (2W / 4W) | **Vehicle loan** (hypothecation-secured) | Secured by the vehicle; far cheaper than a personal loan for the same thing | Market |
| Vehicle is an **EV**, purpose is livelihood | Flag **EV / green financing schemes** (OEM tie-ups, some PSU/NBFC) | Materially cheaper band exists; borrower should ask for it by name | My judgement |
| Has gold, needs fast small-ticket funds | **Gold loan** | Same-day, no income proof, cheaper than personal | Market |
| Salaried, consumption purpose, no collateral | **Personal loan** | The default when nothing better fits | Market |
| Unsecured ask **> 15× monthly AMI**, or unsecured FOIR fails, **and** collateral exists | App recommends **switching to a secured product** and re-prices | The single biggest lever a borrower has | My judgement |

---

## 6. Interest-rate bands (nominal, per annum)

Indicative Indian retail market, 2026. **My judgement**, informed by public
lender rate cards (SBI / HDFC / Bajaj / Muthoot / Lendingkart ranges). The app
labels these "indicative - verify against live offers."

Each product is priced on **two bands**, because Indian retail pricing
bifurcates hard by lender archetype: a scheduled bank (PSU / large private) and
an NBFC / fintech quote the same borrower materially different rates for the
same product. The **NBFC band begins where the bank band ends.** Which band
applies is a routing decision (§6.2), not a slider.

| Product | Bank-tier band | NBFC / fintech-tier band | Processing fee | Prudent / max tenure |
|---|---|---|---|---|
| Home loan | **8.40% – 10.00%** | **10.00% – 13.00%** | 0.25%–0.50%, cap ~₹25,000 | 15 yr / 30 yr (to age 65–70) |
| LAP | **9.50% – 12.50%** | **12.50% – 19.00%** | 0.50%–1.50% | 10 yr / 15 yr |
| Personal loan | **10.50% – 16.00%** | **16.00% – 28.00%** | 1.00%–3.00% | 3 yr / 6 yr |
| Business loan (unsecured) | **14.00% – 19.00%** | **19.00% – 30.00%** | 2.00%–3.00% | 3 yr / 5 yr |
| Gold loan | **8.50% – 14.00%** | **14.00% – 26.00%** | 0.25%–1.50% | 1 yr / 3 yr |
| Two-wheeler loan | **9.50% – 14.00%** | **14.00% – 24.00%** | 1.00%–3.00% + ~₹3,000 | 3 yr / 5 yr |
| EV two-wheeler (scheme) | **7.00% – 11.00%** | **11.00% – 18.00%** | 1.00%–2.00% | 3 yr / 5 yr |

`config.ts` also carries a `rate` envelope per product (bank floor → NBFC
ceiling); it is display-only and used to clamp the Quote Checker.

### 6.1 Where in the band a borrower lands

First pick the tier band (§6.2). A wide band (an NBFC personal loan is 16-28%)
can't be priced by small point-nudges off the midpoint, so the model works in
**band position** `t`, a 0-to-1 number where 0 is the band floor (cheapest) and
1 is the ceiling. Start at `t = 0.5` and add the shifts below; the nominal rate
is then `bandLo + t x (bandHi - bandLo)`, clamped to the band. All values are in
`config.ts` as `RATE_ADJ.pos`.

| Factor | Position shift | Why | Source |
|---|---|---|---|
| Credit score ≥ 800 | **−0.42** | Prime; lenders compete for them | My judgement |
| Score 750 – 799 | **−0.30** | | |
| Score 700 – 749 | **−0.12** | Near the reference midpoint | |
| Score 650 – 699 | **+0.28** | Sub-prime pricing | |
| Score < 650 | **+0.45** (verdict may also decline an unsecured loan if FOIR-stressed, §8) | | |
| **Score unknown** (has borrowed, hasn't checked) | No centre shift. Band half-width forced to **±2.0 pts**; confidence → low | "I don't know my score" is not a 300 (brief rule 3) | Brief |
| **Thin file** - never borrowed, no score (Ravi) | Secured **+0.08** (collateral prices it), unsecured **+0.35** and low confidence | Collateral prices the loan, not history | My judgement |
| Salaried at large / listed / government employer | **−0.08** | Lower attrition / default risk category | My judgement |
| Self-employed, priced unsecured | **+0.15** | Income-verification risk premium | My judgement |
| Informal income, priced unsecured | **+0.30** (or route to secured, §5) | | My judgement |
| Existing lender relationship / salary account | **−0.04** | Cross-sell discount is real | My judgement |
| Loan is **productive** (income-generating) | **0.0** - noted in the "why" only | A lender prices risk, not your business plan. It helps the *verdict*, not the *quote* | My judgement |

Output O3 is a **band**, not a point: `centre ± residualUncertainty` in
percentage points, where `residualUncertainty` shrinks from **±3.0** (only the
core questions answered) toward **±0.75** as the rate-relevant fine-tuning
questions are answered, and is floored at **±2.0** whenever the credit score is
unknown or overall confidence is low. The band is clamped to the tier band.

### 6.2 Which tier prices this borrower

The bank and NBFC bands differ enough (§6) that picking the wrong one is a
domain error, not a rounding one. `rate.ts` `lenderTier()` decides:

| Situation | Tier | Why | Source |
|---|---|---|---|
| Property-backed loan (home, LAP), score unknown or ≥ 650 | **Bank** | Banks dominate property-backed lending and will underwrite a thin or weak file when the asset carries it | My judgement |
| Property-backed loan, **known** score < 650 | NBFC | Below what most banks accept even against property | My judgement |
| Any other loan: salaried / documented self-employed, score unknown or ≥ 700, has borrowed before | **Bank** | A profile a scheduled bank underwrites | My judgement |
| Any other loan: **informal income**, OR genuine **thin file** (never borrowed), OR **known** score < 700 | NBFC | A bank branch declines; an NBFC / captive financier lends, at a premium | My judgement |
| Score **unknown** on its own | **No demotion** | Unknown widens the band (§6.1), it never moves the borrower to a worse tier - brief rule 3 | Brief |

When the answer is NBFC, the "why" line names what would move the borrower up:
12 months of ITR or salary slips, a co-applicant with formal income, or
property to pledge (a LAP). Worked examples: Priya → bank (prime salaried);
Ravi → bank (property-backed LAP, thin file carried by the ₹45L shop);
Anita → NBFC (informal income, no history, small-ticket EV loan).

---

## 7. All-in APR (RBI-style)

The nominal rate is not the price. APR folds in the **processing fee**, **GST on
that fee (18%)**, and **loan-protection insurance** where the product bundles
it - which, per §7 below, is usually optional and the app tells the borrower
to ask the lender to drop it.

| What | Value | Why | Source |
|---|---|---|---|
| APR method | Internal rate of return of the real cashflows: `t0 = +(principal − upfrontFees)`, `t1..n = −EMI`, annualised | This is what "all-in" means; matches RBI Key Fact Statement intent | RBI Fair Practices / KFS guidance |
| `upfrontFees` | processing fee × (1 + 0.18 GST) + bundled insurance premium | GST on financial-service fees is 18% | GST schedule |
| Bundled insurance assumption | **0** for home/LAP/gold · **1.0%** of principal for personal / business · **0.8%** for vehicle / EV, one-time, financed into the loan | These products often bundle single-premium credit cover; it is usually optional and the app tells the borrower to refuse it | My judgement, common market practice |
| APR band reported | Apply the fee/insurance math to **both ends** of the O3 rate band | Borrower compares the lender's quoted APR against a range, not a point | Brief (O3) |
| Headline comparison line | "Fair all-in APR for you: **X% – Y%**. A quote above **Y% + 1.5** is a markup worth challenging." | Gives the borrower a bright line to negotiate against | My judgement |

---

## 8. Verdict (O1) - borrow / borrow less / don't borrow

Computed after §§1–7. **"Don't" must be reachable** (brief).

### 8.1 "Don't borrow" - fires if ANY of:

| Trigger | Threshold | Why | Source |
|---|---|---|---|
| Cannot carry it | Borrower safe new EMI ≤ **0** after subsistence + existing obligations | The household is already at or past its floor | My judgement |
| Fresh distress | A bounced payment in the **last 3 months** AND existing-obligation FOIR > **50%** | Already missing payments while heavily committed | My judgement |
| Expensive-debt trap | Outstanding high-cost debt (APR > 28%) > **1× monthly AMI** AND the new loan is **unsecured** | New unsecured debt on top of a 30% stack deepens the hole; fix that first | My judgement |
| Stress test fails hard | Under **income −20%** *or* **rate +3.0 pts**, total FOIR > **70%** | No shock absorption left | My judgement |
| Thin buffer + stretch | Unsecured, non-productive, post-loan FOIR > **55%**, emergency savings < **1 month** | Classic over-leverage pattern | My judgement |

When "Don't" fires, the app still returns a **constructive path** (what to fix,
what smaller/secured alternative exists, when to re-check) - never a dead end.

### 8.2 "Borrow less" - fires if none of the above and ANY of:

| Trigger | Recommended amount |
|---|---|
| Requested > `min(lender, borrower)` safe principal by > **10%** | The `min(...)` safe principal, naming which one binds |
| FOIR fine but emergency savings < **2 months** and the loan is unsecured | About **75%** of the borrower safe principal, plus "build a buffer first" |

### 8.3 "Borrow" (as requested) - all of:

- Requested ≤ `min(lender safe principal, borrower safe principal)`
- No §8.1 trigger
- Stress case (§9) keeps total FOIR < **60%**
- If unsecured and collateral exists, the app still shows the secured
  alternative as "cheaper option available" - approval is not endorsement.

Every verdict carries a **one-sentence why** naming the binding number, e.g.
*"Your ceiling is ₹22,000 not ₹30,000 because a wedding loan shouldn't take more
than a fifth of your take-home, and that caps the loan at about ₹7,00,000 over 3
years."*

---

## 9. EMI ceiling, tenure trade-off, stress case (O4)

| What | Value | Why | Source |
|---|---|---|---|
| Recommended EMI ceiling | `min(lender ceiling EMI, borrower safe EMI)` | The binding constraint | §§3–4 |
| EMI formula | Standard reducing-balance: `E = P·r·(1+r)^n / ((1+r)^n − 1)`, `r` = monthly rate, `n` = months | Universal | Definitional |
| Prudent tenure default | Home 15y · LAP 10y · Personal 3y · Business 3y · Gold 1y · Vehicle 3y · EV 3y | Minimise lifetime interest; the app shows the longer option too | My judgement |
| Tenure trade-off shown | For the recommended amount, show EMI + total interest at **prudent** vs **maximum** tenure | Longer tenure lowers EMI but can *double* interest - the borrower must see both | Brief (O4) |
| Stress case 1 - income drop | Recompute FOIR and "can you still pay" at **AMI × 0.80** | Job loss / slow season | Brief (O4) |
| Stress case 2 - rate rise | Recompute EMI at **nominal rate + 2.0 pts** (floating products) or **+3.0** (worst case shown) | Repo cycles move 200–250 bps | My judgement, recent RBI cycles |
| Stress verdict | "comfortable" (FOIR < 50%) · "tight" (50–65%) · "breaks" (> 65% or EMI > safe capacity) | Plain words the borrower can act on | My judgement |

---

## 10. Confidence - it widens with silence

| What | Value | Why | Source |
|---|---|---|---|
| Confidence inputs | (a) # of relevant additional questions answered, (b) AMI confidence §1, (c) score known?, (d) income type | These are what actually move uncertainty | My judgement |
| Levels | **Low** (core set only, or informal + no score) · **Medium** (some fine-tuning answered, or documented self-employed) · **High** (all relevant fine-tuning answered, salaried, score known) | | |
| Effect on O2 (amount) | Low → report a **±25%** band around the point · Medium → ±15% · High → ±8% | Fewer answers, wider band (brief rule 2) | My judgement |
| Effect on O3 (rate) | `residualUncertainty` ±3.0 → ±0.75 as above | | §6 |
| Effect on O4 (EMI) | Ceiling shown as a range with the same width as O2 | Consistency | My judgement |
| Hard rule | **Never narrow a band without an answer that justifies it.** A skipped question always widens or holds; it never tightens. | Brief rule 2 | Brief |
| On-screen text | Every output states which answers it is missing and what answering them would do ("Tell us your card balances → tightens the amount by ~₹80,000"). | Brief (explainability) | Brief |

---

## 11. Defaults for unanswered questions

Used only when a question is skipped. All are **conservative** (they cost the
borrower eligibility, never gift it) and all are shown on screen as assumptions.

| Question skipped | Assumed value | Direction | Source |
|---|---|---|---|
| Household / living expenses | `subsistenceFloor` (§4) | Conservative (higher expense) | My judgement |
| Rent paid | **₹0** (assumes owned / family home) | Conservative for a renter (real rent only lowers the safe number) | My judgement |
| Ever borrowed formally (thin-file flag) | Treated as **score-unknown**, not as a genuine thin file - band widens, no thin-file premium | Conservative-bounded (a real thin file is priced worse, so this under-warns rather than over-warns) | My judgement |
| Emergency savings (months) | **0 months** | Conservative | Brief rule 3 |
| Credit-card utilisation | **50%** of limit; if no limit given, card ignored + confidence capped | Conservative-bounded | My judgement |
| Past bounces | **None assumed**, but confidence capped at Medium | Can't invent a bounce; can't fully trust the file either | My judgement |
| Income stability / years in trade | Worst tier (highest haircut, §1) | Conservative | My judgement |
| Variable-income share | Treated as 100% variable if self-employed and unstated | Conservative | My judgement |
| Co-applicant income | **₹0** | Conservative | My judgement |
| Collateral value | **₹0** (no secured routing unless a value is given) | Conservative | My judgement |
| Upcoming large expense | **None** | Neutral (can't infer) | My judgement |
| Credit score (salaried, unstated) | Modelled as **unknown**, not a number - band widens ±2.0, no centre penalty | Brief rule 3 | Brief |

---

## 12a. Productive-loan check (a companion to O1, not one of the four required outputs)

The brief asks additional questions to cover "what the loan will *earn* if it is
productive." This is answered as its own small, clearly-labelled check, never as
an input to income or affordability.

| What | Value | Why | Source |
|---|---|---|---|
| When shown | Only if `loanIsProductive = true` **and** the borrower gave an expected monthly return | No basis to guess a number the borrower did not give | My judgement |
| What it computes | `expected return - EMI at the recommended amount` = monthly surplus | Answers "does this specific loan pay for itself" | My judgement |
| Effect on AMI / ceilings / verdict | **None. Zero.** An expected return is never added to income, never raises a ceiling, never changes the O1 call | An expected return is not guaranteed income; treating it as such would let optimism buy eligibility it has not earned | Brief §"honesty about limits" |
| Effect on the report | A one-line note strengthening or weakening confidence in the verdict already reached, e.g. "this loan pays for itself" or "it would not, on these numbers" | Gives the borrower one more fact without corrupting the affordability math | My judgement |

This deliberately keeps two questions separate that are easy to conflate: **"can
the household take on a new EMI at all"** (O1/O2, unaffected by this check) and
**"would this specific loan be a good bet if the household could"** (this check).
Anita's scooter can clear this second bar (it would net a small monthly surplus)
while the app still says don't borrow on the first bar - existing 30%+ debt and
a fresh bounce mean nothing new should be added regardless of whether the
scooter itself pencils out. See `RUN_THROUGHS.md`.

---

## 12b. Quote Checker (on-demand, not part of the four scored outputs)

The brief asks the app to let a borrower "compare the lender's quote honestly."
Rather than a questionnaire field, this is a small on-demand tool shown after the
report: the borrower types in what a lender actually quoted them (amount, rate,
tenure, fee, any other disclosed charge), and it is scored against the *same*
fair band and the *same* all-in-APR formula (`finance.ts: apr()`) used
everywhere else in the app - never a second pricing model.

| What | Value | Why | Source |
|---|---|---|---|
| Comparison basis | The quote's all-in APR vs. this borrower's O3 APR band | Comparing APR to APR, not a lender's nominal rate to a borrower's APR, which would be misleading | Brief §"compare the lender's quote honestly" |
| Tolerance band edge | ±0.05 percentage points | Avoids the verdict flipping on floating-point noise right at the boundary | My judgement |
| "Extra cost" figure | Total interest at the quoted rate minus total interest at the **top** of the fair *nominal* band, same amount and tenure | A concrete rupee number is more persuasive in a branch than a percentage-point gap | My judgement |
| Below-fair-range result | Still shown, flagged to double-check for a teaser rate or an undisclosed charge | A rate that looks too good is itself a signal worth a beat of scepticism | My judgement |

---

## 12c. What is NOT scored / affected by these two additions

- Neither the productive-loan check nor the Quote Checker changes AMI, the
  lender ceiling, the borrower ceiling, the EMI ceiling, or the O1 verdict.
  `engine.test.ts` asserts this directly (a ₹50 lakh/month "expected return" on
  Ravi's loan moves the productive-check surplus and nothing else).
- Both are visually and structurally separated from O1-O4 in the UI (no
  O-number, a distinct heading) so they read as *companions* to the four
  required outputs, not a fifth and sixth output competing for the same 20/20
  explainability points.

---

## 13. What this app does **not** know / do

- No bureau data. A stated score is trusted as given; an unstated one stays unknown.
- No live rate feed. Bands in §6 are 2026 indicative judgement calls; a real
  offer can sit outside them.
- No lender-specific policy. Real FOIR grids, cut-offs and pricing vary by lender,
  city, employer list and month. The app models the *market*, not a bank.
- No verification of anything the borrower types. Garbage in, garbage out - the
  app mitigates this only through haircuts, floors and conservative defaults.
- No tax, legal or investment advice. "Productive loan" reasoning is about
  repayment capacity, not a business valuation.
- No collections/hardship guidance beyond "fix the expensive debt first, re-check
  in N months."
- Rupee amounts are rounded for display (nearest ₹1,000 for principals, nearest
  ₹100 for EMIs); internal math uses full precision.

---

## 14. Change log

| Date | Change | Rationale |
|---|---|---|
| 2026-09-04 | Initial ruleset | Build challenge v1.0 |
| 2026-09-04 | Added §12a (productive-loan check) and §12b (Quote Checker); wired the previously-unused `expectedMonthlyReturnFromLoan` field into a real, isolated check; removed the unused `offersReceived` field in favour of the Quote Checker | An external review of the build correctly flagged two questionnaire fields that were captured but never read by the engine - a real gap, not a style note |
| 2026-09-08 | Tightened the must-set to 9 questions: moved rent, household spend and the thin-file check to the additional tier (each already has a conservative default in §11, so a skip widens the band, never blocks the report). Softened "what a lender will sanction" to "our estimate of what a lender is likely to sanction" in the verdict text, matching §3 and the O2 label | Keeps the must-set genuinely tight (brief rule on question design) and removes the one place the copy sounded more certain than the model is |
| 2026-09-08 | Split every product's rate band into a **bank tier** and an **NBFC / fintech tier** (§6), added §6.2 tier-routing in `rate.ts` (`lenderTier()`), surfaced the tier and its reason in O3, added 5 tests | Real Indian retail pricing bifurcates hard by lender archetype; pricing a thin-file informal borrower on bank rates was the one place the rate model was optimistic. Unknown score still never demotes a tier (rule 3). Personas: Priya/Ravi bank, Anita NBFC |
| 2026-09-08 | Moved household spend back into the main (must) question flow; it keeps its subsistence-floor default from §11, so a skip still produces the report. Must-set is now ~10; rent and the thin-file check stay in the additional tier | It is load-bearing for "what you can safely carry" and a borrower is far more likely to answer it when it is asked up front rather than buried under an optional section |
| 2026-09-08 | Moved the §6.1 rate-position shifts out of a hardcoded block in `rate.ts` and into `config.ts` (`RATE_ADJ.pos`); rewrote §6.1 to describe the actual 0-1 band-position model instead of the older point-nudge table. Removed the dead point-value fields | The one place a pricing rule was not in the single config file, which contradicts the whole "change one number" design. No output changed (52 tests unmoved) |
| 2026-09-08 | Added **Basic / Advanced** entry modes: Basic asks the ~10 core questions then prompts for the rest on the report; Advanced adds the fine-tuning questions up front. Same engine and defaults for both | Progressive disclosure - a two-minute path and a thorough path from one landing screen, without a longer mandatory form |
| 2026-09-08 | Added **Save as PDF** on the report (browser print path, nothing stored): print-only header with product name, date and the "not a lender offer" disclaimer; the assumptions block prints, the jump bar / tighten panel / quote checker do not | The brief wants the borrower to carry the Card into a branch; a saved page does that without persistence |
