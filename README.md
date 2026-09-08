# Borrower Copilot

**Live:** https://lokta-borrower-copilot.vercel.app

A self-assessment tool that makes an Indian borrower the best-informed person in
the room before they walk into a lender. It answers four questions from what the
borrower tells it, with no login, no bureau pull, and nothing stored:

1. **Should I borrow at all?** (borrow / borrow less / don't borrow)
2. **How much am I really eligible for?** (what a lender is likely to sanction vs. what I can safely carry)
3. **What is a fair rate for me?** (a band, on bank-tier or NBFC-tier pricing, plus the all-in APR with fees)
4. **What EMI should I agree to?** (a monthly ceiling, the tenure trade-off, and two stress cases)

...then it prints a one-page **Negotiation Card** the borrower can hold up to a lender.

---

## Run it (under 5 minutes)

Requires Node 20+ (built on Node 26).

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). No backend, no environment
variables, no database. Everything runs in the browser.

```bash
npm test        # 52 unit tests: finance math, all three sample borrowers,
                # adaptive question gates, lender-tier routing, stress cases
npm run build   # type-check + production build to dist/
```

On the landing screen, pick **Basic** (~10 core questions) or **Advanced** (adds
the fine-tuning questions up front). Or click one of the sample borrowers -
Priya, Ravi, Anita - to jump straight to a finished report.

---

## The four deliverables, and where they are

| Deliverable | Location |
|---|---|
| The working app | this repo, `npm run dev` |
| **RULES.md** | [`RULES.md`](RULES.md) - every rule, threshold, band and assumption as *what · value · why · source* |
| **Three run-throughs** | [`RUN_THROUGHS.md`](RUN_THROUGHS.md) - Priya, Ravi, Anita: questions asked, four outputs, Negotiation Card |
| **Walkthrough** | [`WALKTHROUGH.md`](WALKTHROUGH.md) - what I built, what I would build next, what I would cut |

---

## How it is put together

The scoring rubric asks for rules separated from UI, so that is the spine of the
codebase.

```
src/
  rules/                 ← pure TypeScript. No React import anywhere in here.
    config.ts            ← THE ONE FILE TO CHANGE. Every number lives here.
    finance.ts           ← EMI, present value, APR (IRR). Standard formulas, unit-tested.
    income.ts            ← assessed monthly income: haircuts, evidence tiers, co-applicant
    obligations.ts       ← existing monthly commitments (FOIR numerator)
    routing.ts           ← which product this should even be (home / LAP / personal / gold / vehicle / EV)
    ceilings.ts          ← lender ceiling (FOIR) and borrower ceiling (affordability)
    rate.ts              ← lender tier (bank vs NBFC band), position within it, all-in APR
    stress.ts            ← income −20% and rate +2pts
    verdict.ts           ← borrow / borrow less / don't borrow, with the one-sentence why
    quoteCheck.ts         ← on-demand: score an actual lender quote against the fair band
    engine.ts            ← assess(answers) → Assessment. Orchestrates the above. Builds the Card.
    engine.test.ts       ← finance math, Priya / Ravi / Anita, tier routing, stress, quote checker
  questions/
    schema.ts            ← the question bank: 2 tiers (9 must + adaptive), show() gates, "what this moves"
    schema.test.ts       ← the adaptive show() gates and must-set size, asserted
  personas/
    index.ts             ← the three brief borrowers as answer sets (also used by the tests)
  components/             ← the UI. Reads Assessment, renders it. Holds no lending logic.
```

**To change a rule** (the follow-up interview asks for this live): open
`src/rules/config.ts`, change the value, and the whole app - every output, every
range, the Card, the tests - moves with it. `RULES.md` is laid out section for
section to match that file.

### The two-number core (O2)

Every lender has an internal model of what a borrower gets. The borrower has
nothing. So the app computes **two** ceilings from the same answers:

- **Lender ceiling** - FOIR math: a percentage of income, minus existing EMIs,
  stretched over the maximum tenure at the expected rate. Optimistic on purpose.
- **Borrower ceiling** - the same income minus rent, essentials (floored at a
  subsistence level), a protected savings contribution, and a volatility cushion
  for non-salaried income; discretionary loans are additionally capped at 20% of
  take-home. Prudent tenure, not maximum.

The report shows both, side by side, and tells the borrower to use the lower one,
in one sentence naming why it binds.

### Bank rates and NBFC rates are different bands

Every product carries two rate bands - a bank-tier band and an NBFC/fintech-tier
band that starts where the bank band ends - because Indian retail pricing
bifurcates hard between the two. `rate.ts` routes the borrower to one: a
property-backed loan or a documented, bankable profile gets bank-tier pricing;
informal income, a genuine thin file, or a known sub-700 score on anything else
gets NBFC-tier, with a note saying what would move them up. An unknown score is
never on its own a demotion. (`RULES.md` §6.2.)

### Confidence widens with silence

**Basic** mode asks the ~10 core questions; **Advanced** adds the fine-tuning
ones up front. Either way, answer only the core set and every range is wide and
labelled low confidence. Each fine-tuning question is gated on whether it can
change an output; answering it narrows a specific number, and the report says
which. A skipped question never narrows anything - the engine substitutes a
conservative default
(documented in `RULES.md` §11) and widens.

### Unknown is not zero

"I don't know my credit score" is modelled as *unknown*: the rate band widens
around the middle, with no penalty to the centre. It is never treated as 300.
"Never borrowed" (a genuine thin file) is a separate answer with its own,
smaller, handling - tiny on a secured loan, real on an unsecured one.

---

## What this does not do

See `RULES.md` §13. In short: no bureau data, no live rate feed, no
lender-specific policy, no verification of anything typed in. The bank and NBFC
rate bands are 2026-indicative judgement calls; a real offer can sit outside
them. Not financial advice.
