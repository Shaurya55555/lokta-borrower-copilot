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
  ├─► rate band + all-in APR               §6,§7
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
| Credit-card dues | **5%** of stated outstanding balance per month | RBI minimum-due norm is ~5%; treat that as the recurring obligation | RBI card norms / my judgement |
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
(mid-band) rate** for the routed product, over the **maximum tenure the product
allows** (§9). This is deliberately the optimistic end - it is what a lender
*could* stretch to, not what the borrower *should* take.

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
| Consumption-loan prudence cap | New EMI additionally capped at **20% of net income** when the loan purpose is **non-productive** (wedding, travel, consumer durable, debt-funded lifestyle) | A discretionary want should not command more than a fifth of take-home; keeps the borrower liquid | My judgement |

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
| Owns property (any equity), wants funds for anything | **Loan against property (LAP)** | Unlocks the asset at a fraction of unsecured cost | Market |
| Business / working capital **and** owns property | **LAP or secured business loan** - *not* unsecured | This is the Ravi case: collateral should do the talking, not a score he doesn't have | My judgement + brief scoring note |
| Business / working capital, **no** collateral | Unsecured business loan (small ticket, high rate) | Only option; app must show how small and how expensive | Market |
| Vehicle purchase (2W / 4W) | **Vehicle loan** (hypothecation-secured) | Secured by the vehicle; far cheaper than a personal loan for the same thing | Market |
| Vehicle is an **EV**, purpose is livelihood | Flag **EV / green financing schemes** (OEM tie-ups, some PSU/NBFC) | Materially cheaper band exists; borrower should ask for it by name | My judgement |
| Has gold, needs fast small-ticket funds | **Gold loan** | Same-day, no income proof, cheaper than personal | Market |
| Salaried, consumption purpose, no collateral | **Personal loan** | The default when nothing better fits | Market |
| Unsecured ask **> 15× monthly AMI**, or unsecured FOIR fails, **and** collateral exists | App recommends **switching to a secured product** and re-prices | The single biggest lever a borrower has | My judgement |

---

## 6. Interest-rate bands (nominal, per annum)

Indicative Indian retail market, 2026. **My judgement**, informed by public
lender rate cards (SBI / HDFC / Bajaj / Muthoot ranges). The app labels these
"indicative - verify against live offers."

| Product | Rate band | Processing fee | Prudent / max tenure |
|---|---|---|---|
| Home loan | **8.40% – 9.75%** (floating, repo-linked) | 0.25%–0.50%, cap ~₹25,000 | 15 yr / 30 yr (to age 65–70) |
| LAP | **9.50% – 12.00%** | 0.50%–1.50% | 10 yr / 15 yr |
| Personal loan | **10.50% – 24.00%** | 1.00%–3.00% | 3 yr / 6 yr |
| Business loan (unsecured) | **15.00% – 26.00%** | 2.00%–3.00% | 3 yr / 5 yr |
| Gold loan | **9.00% – 18.00%** | 0.25%–1.50% | 1 yr / 3 yr |
| Two-wheeler loan | **9.50% – 22.00%** | 1.00%–3.00% + ~₹3,000 | 3 yr / 5 yr |
| EV two-wheeler (scheme) | **7.00% – 12.00%** | 1.00%–2.00% | 3 yr / 5 yr |

### 6.1 Where in the band a borrower lands

Start at the **band midpoint**, then apply additive adjustments (percentage
points), clamped to the band:

| Factor | Adjustment | Why | Source |
|---|---|---|---|
| Credit score ≥ 800 | −2.0 | Prime; lenders compete for them | My judgement |
| Score 750 – 799 | −1.0 | | |
| Score 700 – 749 | 0.0 | Reference band | |
| Score 650 – 699 | +2.5 | Sub-prime pricing | |
| Score < 650 | +4.0, and **decline unsecured** if also FOIR-stressed | | |
| **Score unknown** (never checked) | Widen band by **±2.0** around midpoint; **no penalty to the centre**; confidence → low | "I don't know my score" is not a 300 (brief rule 3) | Brief |
| **Thin file** - never borrowed, no score (Ravi) | For **secured**: midpoint +0.5, near-normal - secured rate barely uses score. For **unsecured**: +3.0 and low confidence | Collateral prices the loan, not history | My judgement |
| Salaried at large/listed/government employer | −0.5 | Lower attrition/default risk category | My judgement |
| Self-employed (priced unsecured) | +1.5 | Income-verification risk premium | My judgement |
| Informal income (priced unsecured) | +3.0, or steer to secured | | My judgement |
| Existing lender relationship / salary account | −0.25 | Cross-sell discount is real | My judgement |
| Loan is **productive** (income-generating) | **0.0 to the rate** - but note it in the "why" | Honesty: a lender prices risk, not your business plan. It helps the *verdict*, not the *quote* | My judgement |

Output O3 is a **band**: `[adjusted − residualUncertainty, adjusted +
residualUncertainty]` where `residualUncertainty` shrinks from **±3.0** (only
must-questions answered) to **±0.75** (all relevant additional questions
answered).

---

## 7. All-in APR (RBI-style)

The nominal rate is not the price. APR folds in the **processing fee**, **GST on
that fee (18%)**, and **mandatory loan-protection insurance** where the product
typically bundles it.

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
| Requested > `min(lender, borrower)` safe principal by > **10%** | The `min(...)` safe principal |
| Requested ≤ lender max but > borrower safe principal | The borrower safe principal, with the gap named |
| FOIR fine but emergency savings < **2 months** | Smaller amount that keeps EMI ≤ 15% of AMI, plus "build a buffer first" |
| Non-productive purpose stretching FOIR past **45%** | Amount that lands FOIR at 40% |

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
| Recommended EMI ceiling | `min(lender max EMI, borrower safe EMI)` | The binding constraint | §§3–4 |
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
| Levels | **Low** (must-set only, or informal + no score) · **Medium** (some additional, or documented self-employed) · **High** (all relevant additional answered, salaried, score known) | | |
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
| Emergency savings (months) | **0 months** | Conservative | Brief rule 3 |
| Credit-card utilisation | **50%** of limit; if no limit given, card ignored + confidence capped | Conservative-bounded | My judgement |
| Past bounces | **None assumed**, but confidence capped at Medium | Can't invent a bounce; can't fully trust the file either | My judgement |
| Income stability / years in trade | Worst tier (highest haircut, §1) | Conservative | My judgement |
| Variable-income share | Treated as 100% variable if self-employed and unstated | Conservative | My judgement |
| Co-applicant income | **₹0** | Conservative | My judgement |
| Collateral value | **₹0** (no secured routing unless a value is given) | Conservative | My judgement |
| Upcoming large expense | **None** | Neutral (can't infer) | My judgement |
| Existing offers received | **None** | Neutral | My judgement |
| Credit score (salaried, unstated) | Modelled as **unknown**, not a number - band widens ±2.0, no centre penalty | Brief rule 3 | Brief |

---

## 12. What this app does **not** know / do

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

## 13. Change log

| Date | Change | Rationale |
|---|---|---|
| 2026-09-04 | Initial ruleset | Build challenge v1.0 |
