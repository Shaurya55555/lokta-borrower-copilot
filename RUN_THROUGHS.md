# Three run-throughs

Priya, Ravi and Anita from the brief, exactly as the app processes them. Each
section lists the questions the app asked (and which it adaptively skipped), the
four outputs, and the Negotiation Card.

Reproduce any of these: `npm run dev` -> landing screen -> click a sample
borrower (Priya / Ravi / Anita), which jumps straight to that report. Or
`npx tsx scripts/dump.ts` for the raw engine output, `npx tsx
scripts/questions.ts` for the question lists.

All figures are the engine's, not hand-computed. Rounding: principals to ₹1,000,
EMIs to ₹100. A real user reaches the same report through **Basic** mode (the ~10
core questions) or **Advanced** mode (core plus the fine-tuning questions up
front); the sample borrowers below fill both tiers where the brief gives a value
and leave the rest to the documented defaults.

---

## 1. Priya, 29 - Bengaluru, salaried

> Software engineer at a large MNC for 5 years. Net ₹1,10,000/month. One car
> loan, EMI ₹14,000, 2 years left. Credit score 780. Rents at ₹28,000. Wants
> **₹8,00,000 personal loan for a wedding.**

### Questions asked

**Core (answered, 9):** purpose = wedding · amount = ₹8,00,000 · earns = salaried ·
take-home = ₹1,10,000 · existing EMIs = ₹14,000 · age = 29 · dependents = 0 ·
knows score = yes · score = 780.
**Core (skipped -> default):** household spend -> subsistence floor.

**Fine-tuning (answered):** rent = ₹28,000 · years in job = 5 · large employer = yes.
**Fine-tuning (skipped -> default):** variable-pay share, card balance/limit, past
bounces, emergency-savings months, own an asset to pledge, co-applicant, upcoming
large expense, existing lender relationship.

**Adaptively hidden** (cannot move an output for a salaried consumption
borrower): weak-month income, cash-income evidence, high-cost-debt balance,
"will this loan earn money".

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Borrow less.** | Borrow about **₹6,70,000**, not ₹8,00,000. *Your ask is above what you can safely carry (₹6,70,000). After ₹63,000 of unavoidable monthly outgo (car EMI ₹14,000 + rent ₹28,000 + essentials ₹10,000 + protected savings ₹11,000), ₹1,10,000 leaves ₹22,000 for a new EMI, and a discretionary purpose is additionally capped at 20% of take-home - our own borrower-protection guardrail, not a lender rule. Over a sensible 3-year term that is about ₹6,70,000.* |
| **O2** | A lender is likely to sanction **~₹24.3 L** (band ₹20.7-28.0 L) · You can safely carry **~₹6.7 L** (band ₹5.7-7.7 L). | **Use the "safely carry" number.** A lender would stretch to a higher FOIR; that is their risk appetite, not her safety margin. |
| **O3** | Nominal **10.5% - 12.8%** p.a. (centre 11.2%) · All-in APR **12.9% - 15.2%**. Priced on the **bank-tier** personal-loan band (10.5-16%). | Prime salaried + score 780 -> a scheduled bank underwrites this, so the bank band applies and she sits near its best-priced end; large employer shaves a little more. APR gap over nominal = 2% processing fee + GST + ~1% single-premium insurance, *which is usually optional - refuse it*. |
| **O4** | EMI ceiling **₹22,000** (band ₹18,700-25,300). On ₹6.70 L: 3 yr -> **₹22,000/mo, ₹1,22,000 interest**; 6 yr -> ₹12,800/mo, ₹2,52,000 interest. | Ceiling is the lower of lender-allows (₹46,500) and budget-allows (₹22,000). **Stress:** income -20% -> FOIR 41%, comfortable. Rate +2 pts -> EMI ₹22,641, FOIR 33%, comfortable. |

Confidence: **medium** - the app's own words: "You answered 3 of 11 relevant
extra questions. Answer more from 'tighten these numbers' below to narrow the
ranges further."

**"Show the math behind 'safely carry'"** (a collapsible trace under O2, the same
numbers as the why-sentence above, shown as rows instead of a sentence):

| | |
|---|---:|
| Assessed monthly income | ₹1,10,000 |
| - Already committed each month | ₹14,000 |
| - Rent | ₹28,000 |
| - Household expenses (floored at subsistence for 0 dependents) | ₹10,000 |
| - Protected monthly savings (thin emergency buffer) | ₹11,000 |
| -> capped at Discretionary-loan cap (20% of take-home) | ₹22,000 |
| **Safe new EMI** | **₹22,000** |

### Negotiation Card

> **My position** - Personal loan
> I'm asking for **₹6.70 L** · Indicative rate **10.5%-12.8% p.a.** · Indicative
> all-in APR **12.9%-15.2%** · My EMI ceiling **₹22,000** · Tenure **3 yrs (not 6)**
>
> - This is an unsecured loan.
> - Credit score 780.
> - Fair all-in APR for my profile: 12.9%-15.2%. Anything above 16.7% APR is a markup.
> - I will not cross an EMI of ₹22,000. Prefer 3 years over 6.
> - I am asking for ₹6.70 L, which is what I can carry - not the maximum you will offer.
>
> **Walk-away condition:** If the offer's all-in APR is above 16.7% or the EMI
> above ₹22,000, I walk.
>
> **Ask the lender:** all-in APR (not just the rate) · processing fee, GST
> included? · net amount actually credited · fixed or floating · prepayment
> charges · is insurance bundled, and can it be declined?

---

## 2. Ravi, 42 - Mysuru, self-employed

> Kirana store for 14 years. Cash income ₹40,000-80,000/month; ITR shows
> ₹4,20,000/year. Owns the shop premises, ~₹45,00,000, unencumbered. Never taken
> a formal loan; no credit score. Wife earns ₹18,000 teaching. Wants
> **₹15,00,000 for a second stock line and a delivery vehicle.**

### Questions asked

**Core (answered, 9):** purpose = business expansion · amount = ₹15,00,000 · earns
= self-employed · ITR income = ₹35,000/mo · weak month = ₹40,000 · existing EMIs
= ₹0 · age = 42 · dependents = 0 (wife earns and co-applies) · knows score = no.
**Core (skipped -> default):** household spend -> subsistence floor.

**Fine-tuning (answered):** **ever borrowed = no** (thin file) · years in trade =
14 · cash-income evidence = none · good month = ₹80,000 · owns asset = commercial
property · asset value = ₹45,00,000 · already mortgaged = no · co-applicant = yes
· co-applicant income = ₹18,000 · co-applicant documented = no · loan will earn
money = yes.
**Fine-tuning (skipped -> default):** rent -> ₹0, card balance/limit, past bounces,
emergency-savings months, upcoming large expense, existing lender relationship.

**Adaptively hidden** (do not apply to a self-employed borrower): large-employer,
variable-pay share, high-cost-debt balance.

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Borrow.** | You can borrow **₹15,00,000** - it fits both tests, as a **secured** loan against the shop, not an unsecured business loan. |
| **O2** | A lender is likely to sanction **~₹19.9 L** (band ₹14.9-24.8 L) · You can safely carry **~₹19.1 L** (band ₹14.3-23.9 L). | **Use the "safely carry" number.** Assessed income ~₹45,800 (ITR ₹35,000 + a haircut share of cash above ITR + half the wife's ₹18,000). After ~₹19,200 of essentials, savings and a volatility cushion, ₹26,600 is left for an EMI ≈ ₹19.1 L over 10 years. |
| **O3** | Nominal **9.5% - 12.5%** p.a. (centre 11.2%) · All-in APR **9.8% - 12.8%**. Priced on the **bank-tier** LAP band - property-backed lending stays bank-tier even on a thin file. | No score, but the loan is secured against property, so the collateral prices it - only a small thin-file premium, *not* the +3 points an unsecured lender would add. On an *unsecured* business loan his thin file + no ITR evidence would land him in the **NBFC tier at 14-30%**; the LAP roughly halves that. This is the whole point of routing him to LAP. (Treat "roughly half" as the defensible claim, not a specific point figure.) |
| **O4** | EMI ceiling **₹22,900**. On ₹15 L: 10 yr -> ₹20,900/mo, ₹10,04,000 interest; 15 yr -> ₹17,300/mo, ₹16,10,000 interest. | **Stress:** income -20% -> FOIR 57%, **tight**. Rate +2 pts -> EMI ₹22,609, FOIR 49%, comfortable. The tight case is why he should take the 10-year term and not let a lender push 15. |

Confidence: **low** (self-employed, no score, cash income unverified - the report
says so, and every band is wide). The app's words: "You answered 7 of 14 relevant
extra questions, and your credit score is unknown - both widen every range above."

Productive-loan check (isolated from every number above, never added to
income): expected return ₹25,000/month vs. EMI ₹20,900 = **+₹4,100/month
surplus**. A reason to lean "borrow" - not a reason the app lets him borrow more.

### Negotiation Card

> **My position** - Loan against property (LAP)
> I'm asking for **₹15 L** · Indicative rate **9.5%-12.5% p.a.** · Indicative
> all-in APR **9.8%-12.8%** · My EMI ceiling **₹22,900** · Tenure **10 yrs (not 15)**
>
> - This is a SECURED loan - price it as one, not as a personal loan.
> - No bureau score - for a secured loan that barely matters.
> - Fair all-in APR for my profile: 9.8%-12.8%. Anything above 14.3% APR is a markup.
> - I will not cross an EMI of ₹22,900. Prefer 10 years over 15.
> - I am asking for ₹15 L, which is what I can carry - not the maximum you will offer.
>
> **Walk-away condition:** If the offer's all-in APR is above 14.3% or the EMI
> above ₹22,900, I walk.
>
> **Ask the lender:** all-in APR (not just the rate) · processing fee, GST
> included? · net amount actually credited · fixed or floating · prepayment
> charges · is insurance bundled, and can it be declined?

### Quote Checker, run against this profile

Suppose a lender quotes Ravi ₹15 L at **14.5%**, 120 months, no disclosed fee.
Checked against his 9.8-12.8% fair APR band:

> **This quote is above your fair range by 1.7%.**
> Their EMI ₹23,743 · Total repayment over the full tenure ₹28,49,162 ·
> All-in APR on this quote **14.5%**, against a fair range of 9.8-12.8%.
> Even against the TOP of that range, this quote costs about **₹2,14,391**
> more in interest over the life of the loan. Ask the lender to explain the
> premium, or walk.

(Verified live on the deployed app - this is not a hypothetical calculation, it
is what `checkQuote()` actually returns for these inputs.)

---

## 3. Anita, 35 - Hubballi, informal

> Delivery-platform rider plus home tailoring. ₹26,000-30,000/month, two
> children, husband unemployed 8 months. Three app loans, ₹35,000 outstanding at
> 30%+, one EMI bounced last month. Wants **₹1,50,000 for an electric scooter to
> double delivery runs.**

### Questions asked

**Core (answered, 9):** purpose = vehicle · amount = ₹1,50,000 · earns = informal ·
typical month = ₹26,000 · weak month = ₹26,000 · existing EMIs = ₹0 · age = 35 ·
dependents = 3 (husband + two children) · knows score = no.
**Core (skipped -> default):** household spend -> subsistence floor.

**Fine-tuning (answered):** years in trade = 2 · good month = ₹30,000 · past
bounces (12 mo) = 1 · bounce in last 3 months = yes · emergency-savings months =
0 · high-cost-debt balance = ₹35,000 · loan will earn money = yes.
**Fine-tuning (skipped -> default):** ever borrowed -> treated as score-unknown,
rent -> ₹0, card balance/limit, co-applicant, upcoming large expense, existing
lender relationship.

**Adaptively hidden:** large-employer, variable-pay share, cash-income evidence.

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Don't borrow** - not now, and not like this. | *After rent, essentials and what you already owe, there is nothing left for a new EMI - ₹15,600 of assessed income is fully spoken for.* Assessed income = ₹26,000 (weak month) x 60% dependable. **Constructive path:** (1) replace the ₹35,000 of 28%+ debt with a gold or bank consolidation loan at 14-18%; (2) clear the bounce, keep three clean months; (3) add a co-applicant or wait for income to steady; (4) re-run in 3 months. |
| **O2** | A lender is likely to sanction **~₹1,20,000** · You can safely carry **₹0**. | **Use the borrower number.** A lender's sanction math would still offer ~₹1.2 L; the household cannot service any of it. |
| **O3** | Nominal **12.4% - 16.6%** (NBFC EV-scheme band) · All-in APR **19.6% - 24.0%**. | Priced on the **NBFC / captive-financier** band: informal income means a bank branch will not finance this, so the bank EV band (7-11%) does not apply to her - an NBFC will, at a premium, and the "why" line says a co-applicant with salary slips or a LAP would move her to bank pricing. Score unknown -> band widened around the NBFC midpoint, not penalised. Shown as *what to ask for when she is ready*, not what to take now. |
| **O4** | EMI ceiling **₹0** - no room for a new EMI. On the ₹1,50,000 she asked for: 3 yr -> ₹5,200/mo. | **Stress on the requested loan:** income -20% -> FOIR 75%, **breaks**. Rate +2 pts -> EMI ₹5,311, FOIR 61%, tight. Even the base case does not fit, which is why O1 is "don't". |

Confidence: **low**.

### Negotiation Card (a "stop" card, not a negotiation card)

> **No loan - yet**
> Before I sign anything:
>
> - I am not signing a sanction letter today. This is a "not yet".
> - First priority: replace my ₹35,000 of 28%+ app / informal debt with a gold loan or consolidation loan at 14-18%.
> - I need three clean repayment months on record before I apply anywhere.
> - Right now there is no room for any new EMI at all. A loan today comes straight out of essentials.
> - For the vehicle: OEM / state EV scheme financing with a large down-payment, not a personal or top-up loan.
> - Re-check in 3 months - the answer changes when income steadies or the expensive debt is gone.
>
> **Assessed income ₹15,600. After essentials and existing debt there is nothing
> left for a new EMI - signing one now risks the next bounce.**

---

## What the three together demonstrate

- **The lender number and the borrower number are correctly different.** Priya:
  ₹24.3 L vs ₹6.7 L. Ravi: ₹19.9 L vs ₹19.1 L. The app always names which one binds.
- **"Don't borrow" fires when it should** (Anita) and is unreachable by accident
  for the other two.
- **Ravi is routed to a secured product** and priced at ~11% on the bank-tier
  LAP band, roughly half of the 14-30% an unsecured business loan would cost him
  (thin file + no ITR evidence would put him in the NBFC tier there).
- **The bank / NBFC split is applied, not cosmetic.** Priya and Ravi are priced
  on bank-tier bands; Anita, on informal income with no history, is priced on
  the NBFC band for the same product - which is what actually happens at a branch.
- **APR is honest about fees** in every case, and the Quote Checker turns that
  into a rupee number when a real lender quote comes in (Ravi's example above:
  a 14.5% quote costs him ₹2,14,391 more than the top of his fair band).
- **Every number is traceable, not just asserted:** O2's "show the math"
  disclosure (Priya's example above) exposes the same deduction-by-deduction
  arithmetic that produces the one-sentence "why" - because it is the same
  computation, not a second explanation invented after the fact.
- **Adaptive paths:** the salaried engineer, the shopkeeper and the gig worker
  each saw a different question set.
