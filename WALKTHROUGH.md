# Walkthrough

A five-minute read: what I built, the decisions behind it, what I would build
next, and what I deliberately left out.

---

## What it does, in one pass

A borrower opens the app, answers ~9 questions, and gets a report with four
outputs and a one-page Negotiation Card. No login, no bureau pull, nothing
stored. Try `npm run dev` then **"try a sample borrower"** for Priya, Ravi or
Anita.

The report is live: the four outputs appear as soon as the must-questions are
answered, and every additional question below them re-runs the assessment and
visibly tightens a number.

---

## The three decisions that shaped it

### 1. Rules are data, not code

Every threshold, band, haircut and default lives in `src/rules/config.ts` as a
named value with a one-line "why". The engine (`src/rules/*.ts`) is pure
functions over that config; the UI (`src/components/*`) only renders the result.
`RULES.md` is laid out section-for-section against `config.ts`.

This is built for the follow-up interview. "Change the informal income haircut
from 60% to 50%" is one number in one file, and every output, range, stress case,
Card and unit test moves with it. Nothing is hard-coded in a component or buried
in a formula.

### 2. Two ceilings, always shown together

The core insight from the brief is that the lender has a model and the borrower
has nothing. So the engine computes **two** numbers from the same answers:

- **Lender ceiling** - FOIR math. A percentage of assessed income that rises with
  income (40% → 55%, +5 for secured, hard-capped at 45% for informal), minus
  existing obligations, over the *maximum* tenure at the *expected* rate.
  Deliberately optimistic - it is what a lender *could* stretch to.
- **Borrower ceiling** - the same income minus rent, essentials (floored at a
  subsistence level so under-reporting cannot flatter the result), a protected
  10% savings contribution, and a volatility cushion for non-salaried income.
  Discretionary purposes are additionally capped at 20% of take-home. Over a
  *prudent* tenure.

O2 shows both side by side and tells the borrower to use the lower one, in one
sentence naming why it binds. For Priya the gap is ₹23.7 L vs ₹6.6 L; the
20%-of-take-home cap on a wedding loan is doing the work, and the report says so.

### 3. Silence widens, it never narrows

Answer only the must-set and every range is wide and labelled low confidence.
Each additional question is gated - `schema.ts` has a `show()` per question, and
the engine only counts a question as "relevant" if it can move an output for
*this* borrower. A skipped question substitutes a conservative default
(`RULES.md` §11) and widens; it never tightens anything it has no basis to
tighten.

"I don't know my score" is modelled as *unknown*: band widened ±2 points around
the middle, no penalty to the centre. "Never borrowed" is a separate answer -
small premium on a secured loan, real premium on an unsecured one. Neither is
ever a 300.

---

## How the four outputs are built

| Output | Source | Key rule |
|---|---|---|
| O1 verdict | `verdict.ts` | "Don't" fires on: nothing left to service an EMI · fresh bounce + high existing FOIR · >1 month's income in 28%+ debt while borrowing unsecured · stress pushes FOIR past 70% · thin buffer + over-leveraged. Always returns a constructive path, never a dead end. |
| O2 amount | `ceilings.ts` | lender FOIR ceiling vs borrower affordability; report the pair, recommend `min(...)`. |
| O3 rate | `rate.ts` | band *position* (0–1) from score / employer / secured / income type, then the nominal band, then all-in APR as the IRR of the real cashflows (principal − fees, then EMIs). |
| O4 outflow | `engine.ts` + `stress.ts` | EMI ceiling = `min(lender, borrower)`; prudent vs maximum tenure with total interest for each; income −20% and rate +2 pts. |

The **Negotiation Card** is assembled in `engine.ts` from the same numbers -
product, fair APR band, EMI ceiling, tenure, a walk-away line, and bullets that
each trace to an answer. When the verdict is "don't borrow" it becomes a *stop*
card instead: "I am not signing a sanction letter today," plus the fixes.

---

## Two companions to the four outputs

Neither of these is one of the scored O1-O4 outputs - they are deliberately
separate, unnumbered sections in the UI, and neither touches AMI, either
ceiling, or the verdict (`engine.test.ts` asserts this directly).

- **Does this loan pay for itself?** (`RULES.md` §12a) Shown only when the
  borrower says the loan is productive and gives an expected monthly return.
  Compares that return to the EMI at the recommended amount and shows the
  surplus or shortfall - a second, separate lens from "can the household
  afford a new EMI at all." Anita's scooter clears this bar even though the
  household still shouldn't take on new debt right now; the report shows both
  facts rather than collapsing them into one number.
- **Quote Checker** (`RULES.md` §12b, `src/rules/quoteCheck.ts`). An on-demand
  tool below the Negotiation Card: paste in what a lender actually quoted
  (amount, rate, tenure, fee, any other charge) and it is priced with the exact
  same `apr()` function used everywhere else, then compared against this
  borrower's fair APR band, with a rupee figure for what the markup costs over
  the life of the loan.

Both of these started life as fields captured by the schema (`loanIsProductive`
+ `expectedMonthlyReturnFromLoan`, and a since-removed `offersReceived`) that an
earlier pass had declared but never actually read anywhere in the engine - a
real gap an external review caught. Fixing it took the form above rather than
just wiring the number into income, specifically to avoid the more dangerous
mistake: letting an unverified expected return quietly buy the borrower more
eligibility than they actually have.

---

## What I would build next

1. **Sensitivity view on every number.** The engine already knows which answers
   feed each output. Show it: "your ₹22,000 ceiling would be ₹28,000 if you had
   3 months of savings" - turn the internal `missingAnswers` metadata into a
   visible what-if next to each figure.
2. **Real product-rate calibration.** The bands in `config.ts` are 2026
   judgement calls. Replace them with a small, dated table sourced from published
   lender rate cards, with a "last verified" stamp shown in the UI.
3. **A proper FOIR grid per lender archetype** (PSU bank / private bank / NBFC /
   fintech) instead of one market-average curve, since the same borrower gets
   materially different answers from each.
4. **Save/share the report** as a signed URL or a PDF, so the borrower can
   actually carry the Card into a branch without the tab open. (Kept out for now
   - "nothing stored" was a deliberate constraint.)
5. **Regional-language copy.** Anita is the borrower who needs this tool most and
   is least likely to read it in English.

---

## What I deliberately cut

- **A credit model.** The brief said self-assessment, not scoring. Assessed
  income uses documented haircuts, not a learned function.
- **More loan products.** The engine routes the six the three borrowers need
  (home, LAP, personal, gold, two-wheeler, EV). Education loans, top-ups,
  overdrafts, BNPL - all out; adding them is a config entry, not a rewrite.
- **A bureau integration and any persistence.** Both were explicit non-goals and
  both would have eaten the time box.
- **Pixel polish.** The UI is clean, mobile-first, and prints the Card, but I
  spent the hours on the domain logic and `RULES.md`, which is where the score is.
- **An onboarding wizard / progress bar / animations.** The must-questions are
  one scrollable page; the report is one scrollable page. Fewer screens, less to
  misread.
- **Handling every income edge case** (pensioners, NRIs, agricultural income,
  multiple co-applicants). The haircut-and-floor framework extends to them, but
  they are not in the three borrowers and each needs its own justified numbers.

---

## Validation and iteration

45 automated tests cover the finance math, adaptive question visibility,
affordability ceilings, stress cases, all three personas, and quote analysis -
not just arithmetic checks.

Three review passes were used deliberately to challenge the build before
submitting it: domain-logic correctness, source attribution and numeric
precision, and explainability. Each pass's findings were fixed in the actual
code and re-verified against the deployed app, not just noted - full history
in `git log`. The last review found the "Show the math" trace should exist;
it turned out the engine already computed that breakdown internally to build
its one-sentence explanations and simply hadn't returned it, so surfacing it
took no new architecture, only a return statement and a render.

Final check before submission: a fresh `git clone` of the public repo into an
empty folder, then `npm install && npm test && npx tsc -b && npm run build`
from nothing - the same five minutes an evaluator gets. Clean.
