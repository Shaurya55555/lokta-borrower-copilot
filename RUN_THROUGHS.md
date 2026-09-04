# Three run-throughs

Priya, Ravi and Anita from the brief, exactly as the app processes them. Each
section lists the questions the app asked (and which it adaptively skipped), the
four outputs, and the Negotiation Card.

Reproduce any of these: `npm run dev` → intro screen → **try a sample borrower**.
Or `npx tsx scripts/dump.ts` for the raw engine output, `npx tsx
scripts/questions.ts` for the question lists.

All figures are the engine's, not hand-computed. Rounding: principals to ₹1,000,
EMIs to ₹100.

---

## 1. Priya, 29 - Bengaluru, salaried

> Software engineer at a large MNC for 5 years. Net ₹1,10,000/month. One car
> loan, EMI ₹14,000, 2 years left. Credit score 780. Rents at ₹28,000. Wants
> **₹8,00,000 personal loan for a wedding.**

### Questions asked

**Must (answered):** purpose = wedding · amount = ₹8,00,000 · earns = salaried ·
take-home = ₹1,10,000 · existing EMIs = ₹14,000 · rent = ₹28,000 · age = 29 ·
dependents = 0 · knows score = yes · score = 780.
**Must (skipped → default):** household expenses → subsistence floor.

**Additional (answered):** years in job = 5 · large employer = yes.
**Additional (skipped → default):** variable-pay share, card balance/limit, past
bounces, emergency-savings months, own an asset to pledge, co-applicant,
upcoming large expense, existing lender relationship.

**Adaptively hidden** (cannot move an output for a salaried consumption
borrower): cash-income evidence, high-cost-debt balance, "will this loan earn
money".

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Borrow less.** | Borrow about **₹6,61,000**, not ₹8,00,000. *Your ask is above what you can safely carry. After ₹63,000 of unavoidable monthly outgo (car EMI ₹14,000 + rent ₹28,000 + essentials ₹10,000 + protected savings ₹11,000), ₹1,10,000 leaves ₹22,000 for a new EMI, and a wedding is additionally capped at 20% of take-home. Over a sensible 3-year term that is ~₹6,61,000.* |
| **O2** | Lender will sanction **~₹23,7 L** (band ₹20.2–27.3 L) · You can safely carry **~₹6,6 L** (band ₹5.6–7.6 L). | **Use the "safely carry" number.** A lender would stretch to 55% FOIR; that is their risk appetite, not her safety margin. |
| **O3** | Nominal **10.5% – 13.8%** p.a. (centre 12.1%) · All-in APR **12.9% – 16.2%**. | Score 780 puts her near the best-priced end of the personal-loan range; large employer shaves a little more. APR gap over nominal = 2% processing fee + GST + ~1% single-premium insurance, *which is usually optional - refuse it*. |
| **O4** | EMI ceiling **₹22,000** (band ₹18,700–25,300). On ₹6.61 L: 3 yr → **₹22,000/mo, ₹1,31,000 interest**; 6 yr → ₹13,000/mo, ₹2,72,000 interest. | Ceiling is the lower of lender-allows (₹46,500) and budget-allows (₹22,000). **Stress:** income −20% → FOIR 41%, comfortable. Rate +2 pts → EMI ₹22,638, FOIR 33%, comfortable. |

Confidence: **medium** (must-set + 2 additional; score known, salaried).

### Negotiation Card

> **Personal loan**
> I'm asking for **₹6.61 L** · Fair rate **10.5%–13.8% p.a.** · Fair all-in APR
> **12.9%–16.2%** · My EMI ceiling **₹22,000** · Tenure **3 yrs (not 6)**
>
> - This is an unsecured loan.
> - Credit score 780.
> - Fair all-in APR for my profile: 12.9%–16.2%. Anything above 17.7% APR is a markup.
> - I will not cross an EMI of ₹22,000. Prefer 3 years over 6.
> - I am asking for ₹6.61 L, which is what I can carry, not the maximum you will offer.
>
> **If the offer's all-in APR is above 17.7% or the EMI above ₹22,000, I walk.**

---

## 2. Ravi, 42 - Mysuru, self-employed

> Kirana store for 14 years. Cash income ₹40,000–80,000/month; ITR shows
> ₹4,20,000/year. Owns the shop premises, ~₹45,00,000, unencumbered. Never taken
> a formal loan; no credit score. Wife earns ₹18,000 teaching. Wants
> **₹15,00,000 for a second stock line and a delivery vehicle.**

### Questions asked

**Must (answered):** purpose = business expansion · amount = ₹15,00,000 · earns
= self-employed · ITR income = ₹35,000/mo · weak month = ₹40,000 · existing EMIs
= ₹0 · age = 42 · dependents = 0 (wife earns and co-applies) · knows score = no ·
**ever borrowed = no** (thin file).
**Must (skipped → default):** household expenses → subsistence floor; rent → ₹0.

**Additional (answered):** years in trade = 14 · cash-income evidence = none ·
good month = ₹80,000 · owns asset = commercial property · asset value =
₹45,00,000 · already mortgaged = no · co-applicant = yes · co-applicant income =
₹18,000 · co-applicant documented = no · loan will earn money = yes.
**Additional (skipped → default):** card balance/limit, past bounces,
emergency-savings months, upcoming large expense, existing lender relationship.

**Adaptively hidden** (do not apply to a self-employed borrower): large-employer,
variable-pay share, high-cost-debt balance.

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Borrow.** | You can borrow **₹15,00,000** - it fits both tests, as a **secured** loan against the shop, not an unsecured business loan. |
| **O2** | Lender will sanction **~₹20.2 L** (band ₹15.1–25.2 L) · You can safely carry **~₹19.4 L** (band ₹14.5–24.2 L). | **Use the "safely carry" number.** Assessed income ₹45,750 (ITR ₹35,000 + 35% of cash above ITR + half the wife's ₹18,000). After ₹19,150 essentials that leaves ₹26,600 for an EMI ≈ ₹19.4 L over 10 years. |
| **O3** | Nominal **9.5% – 12.0%** p.a. (centre 11.0%) · All-in APR **9.8% – 12.3%**. | No score, but the loan is secured, so the collateral prices it - only a small thin-file premium, *not* the +3 points an unsecured lender would add. Unsecured, he'd be quoted 18–22%; this is the whole point of routing him to LAP. |
| **O4** | EMI ceiling **₹22,900**. On ₹15 L: 10 yr → ₹20,600/mo, ₹9,74,000 interest; 15 yr → ₹17,000/mo, ₹15,60,000 interest. | **Stress:** income −20% → FOIR 56%, **tight**. Rate +2 pts → EMI ₹22,352, FOIR 49%, comfortable. The tight case is why he should take the 10-year term and not let a lender push 15. |

Confidence: **low** (self-employed, no score, cash income unverified - the report
says so and every band is wide).

### Negotiation Card

> **Loan against property (LAP)**
> I'm asking for **₹15 L** · Fair rate **9.5%–12.0% p.a.** · Fair all-in APR
> **9.8%–12.3%** · My EMI ceiling **₹22,900** · Tenure **10 yrs (not 15)**
>
> - This is a SECURED loan - price it as one, not as a personal loan.
> - No bureau score - for a secured loan that barely matters.
> - Fair all-in APR for my profile: 9.8%–12.3%. Anything above 13.8% APR is a markup.
> - I will not cross an EMI of ₹22,900. Prefer 10 years over 15.
> - I am asking for ₹15 L, which is what I can carry, not the maximum you will offer.
>
> **If the offer's all-in APR is above 13.8% or the EMI above ₹22,900, I walk.**

---

## 3. Anita, 35 - Hubballi, informal

> Delivery-platform rider plus home tailoring. ₹26,000–30,000/month, two
> children, husband unemployed 8 months. Three app loans, ₹35,000 outstanding at
> 30%+, one EMI bounced last month. Wants **₹1,50,000 for an electric scooter to
> double delivery runs.**

### Questions asked

**Must (answered):** purpose = vehicle · amount = ₹1,50,000 · earns = informal ·
typical month = ₹26,000 · weak month = ₹26,000 · existing EMIs = ₹0 · age = 35 ·
dependents = 3 (husband + two children) · knows score = no.
**Must (skipped → default):** ever borrowed → treated as score-unknown; household
expenses → subsistence floor; rent → ₹0.

**Additional (answered):** years in trade = 2 · good month = ₹30,000 · past
bounces (12 mo) = 1 · bounce in last 3 months = yes · emergency-savings months =
0 · high-cost-debt balance = ₹35,000 · loan will earn money = yes.
**Additional (skipped → default):** card balance/limit, co-applicant, upcoming
large expense, existing lender relationship.

**Adaptively hidden:** large-employer, variable-pay share, cash-income evidence.

### Outputs

| # | Output | |
|---|---|---|
| **O1** | **Don't borrow** - not now, and not like this. | *After rent, essentials (₹10,000 + ₹18,000 for three dependents) and the app-loan repayments, there is nothing left for a new EMI; ₹15,600 of assessed income is fully spoken for.* Assessed income = ₹26,000 (low end) × 60% dependable. **Constructive path:** (1) replace the ₹35,000 of 28%+ debt with a gold or consolidation loan at 14–18%; (2) clear the bounce, three clean months; (3) add a co-applicant or wait for income to steady; (4) re-check in 3 months. |
| **O2** | Lender will sanction **~₹1,34,000** · You can safely carry **₹0**. | **Use the borrower number.** A lender's sanction math would still offer ~₹1.3 L; the household cannot service any of it. |
| **O3** | Nominal **7.4% – 11.6%** (EV-scheme band) · All-in APR **14.4% – 18.8%**. | Shown as *what to ask for when she is ready*, not what to take now. A work EV qualifies for green-scheme rates; the wide APR is the flat documentation fee on a tiny principal. Score unknown → band widened, not penalised. |
| **O4** | EMI ceiling **₹0** - no room for a new EMI. On the ₹1,50,000 she asked for: 3 yr → ₹4,800/mo. | **Stress on the requested loan:** income −20% → FOIR 72%, **breaks**. Rate +2 pts → EMI ₹4,946, FOIR 59%, tight. Even the base case does not fit, which is why O1 is "don't". |

Confidence: **low**.

### Negotiation Card (a "stop" card, not a negotiation card)

> **No loan - yet**
> Before I sign anything:
>
> - I am not signing a sanction letter today. This is a "not yet".
> - First priority: replace my ₹35,000 of 28%+ app / informal debt with a gold loan or consolidation loan at 14–18%.
> - I need three clean repayment months on record before I apply anywhere.
> - Right now there is no room for any new EMI at all. A loan today comes straight out of essentials.
> - For the vehicle: OEM / state EV scheme financing with a large down-payment, not a personal or top-up loan.
> - Re-check in 3 months - the answer changes when income steadies or the expensive debt is gone.
>
> **Assessed income ₹15,600. After essentials and existing debt there is nothing
> left for a new EMI; signing one now risks the next bounce.**

---

## What the three together demonstrate

- **The lender number and the borrower number are correctly different.** Priya:
  ₹23.7 L vs ₹6.6 L. Ravi: ₹20.2 L vs ₹19.4 L. The app always names which one binds.
- **"Don't borrow" fires when it should** (Anita) and is unreachable by accident
  for the other two.
- **Ravi is routed to a secured product** and priced at ~11% instead of the
  18–22% an unsecured business loan would cost him.
- **APR is honest about fees** in every case, and the Card gives a bright line to
  challenge a quote against.
- **Adaptive paths:** the salaried engineer, the shopkeeper and the gig worker
  each saw a different question set.
