# Borrower Copilot

A self-assessment tool that makes an Indian borrower the best-informed person in
the room before they walk into a lender. It answers four questions from what the
borrower tells it, with no login, no bureau pull, and nothing stored:

1. **Should I borrow at all?** (borrow / borrow less / don't borrow)
2. **How much am I really eligible for?** (what a lender will sanction vs. what I can safely carry)
3. **What is a fair rate for me?** (a band, plus the all-in APR with fees)
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
npm test        # 20 unit tests: the finance math + all three sample borrowers
npm run build   # type-check + production build to dist/
```

On the intro screen, **"try a sample borrower"** loads Priya, Ravi or Anita from
the brief and jumps straight to their report.

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
    rate.ts              ← where in the rate band the borrower lands, and the all-in APR of it
    stress.ts            ← income −20% and rate +2pts
    verdict.ts           ← borrow / borrow less / don't borrow, with the one-sentence why
    quoteCheck.ts         ← on-demand: score an actual lender quote against the fair band
    engine.ts            ← assess(answers) → Assessment. Orchestrates the above. Builds the Card.
    engine.test.ts       ← the finance math + Priya / Ravi / Anita, asserted
  questions/
    schema.ts            ← the question bank: 2 tiers, adaptive show() gates, "what this moves"
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

### Confidence widens with silence

Answer only the ~9 must-questions and every range is wide and labelled low
confidence. Each additional question is gated on whether it can change an output;
answering it narrows a specific number, and the report says which. A skipped
question never narrows anything - the engine substitutes a conservative default
(documented in `RULES.md` §11) and widens.

### Unknown is not zero

"I don't know my credit score" is modelled as *unknown*: the rate band widens
around the middle, with no penalty to the centre. It is never treated as 300.
"Never borrowed" (a genuine thin file) is a separate answer with its own,
smaller, handling - tiny on a secured loan, real on an unsecured one.

---

## What this does not do

See `RULES.md` §12. In short: no bureau data, no live rate feed, no
lender-specific policy, no verification of anything typed in. Rate bands are
2026-indicative judgement calls; a real offer can sit outside them. Not financial
advice.
