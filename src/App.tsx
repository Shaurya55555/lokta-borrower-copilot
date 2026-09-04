import { useState } from 'react';
import { assess } from './rules/engine';
import type { Answers } from './rules/types';
import { QUESTIONS, incomeFieldLabel, visibleQuestions, type Question } from './questions/schema';
import { PERSONAS } from './personas';
import { Field } from './components/Field';
import { Outputs } from './components/Outputs';
import { NegotiationCard } from './components/NegotiationCard';
import { QuoteChecker } from './components/QuoteChecker';

type Stage = 'intro' | 'questions' | 'results';

function withLabels(q: Question, a: Answers): Question {
  if (q.id === 'netMonthlyIncome') return { ...q, label: incomeFieldLabel(a) };
  return q;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<Answers>({});
  const [showMore, setShowMore] = useState(true);

  const setAnswer = (id: keyof Answers, value: unknown) =>
    setAnswers((prev) => {
      const next: Answers = { ...prev, [id]: value };
      if (value === undefined) delete next[id];
      return next;
    });

  // Everything below is derived from `answers` on each render. assess() is pure
  // arithmetic over a dozen small functions - cheap enough to run every render,
  // and keeping it un-memoised sidesteps stale-dependency bugs entirely.
  const visible = visibleQuestions(answers);
  const mustQs = visible.filter((q) => q.tier === 'must');
  const additionalQs = visible.filter((q) => q.tier === 'additional');
  const requiredQs = mustQs.filter((q) => !q.skipNote);
  const mustDone = requiredQs.every((q) => answers[q.id] !== undefined);
  const missingRequired = requiredQs.filter((q) => answers[q.id] === undefined).length;
  const result = mustDone ? assess(answers) : null;

  const loadPersona = (id: string) => {
    setAnswers(PERSONAS.find((p) => p.id === id)!.answers);
    setStage('results');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <header className="no-print border-b border-rule pb-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Borrower Copilot
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-tight text-ink sm:text-[32px]">
          Know your numbers <em className="text-accent">before</em> you walk into a lender.
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Four answers: whether to borrow, how much, at what rate, and the EMI to hold the line on.
          No login, no credit check, nothing stored - everything runs from what you tell it.
        </p>
      </header>

      {stage === 'intro' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-rule bg-paper2 p-4">
            <p className="font-display text-[18px] text-ink">Before we calculate anything</p>
            <p className="mt-1.5 text-[14px] text-muted">
              Let's first figure out whether borrowing makes sense for you. Then we'll work out how
              much you can safely carry, what a fair rate looks like, and what to say yes to when a
              lender gives you an offer.
            </p>
            <p className="mt-2 text-[12px] font-semibold text-accent">
              This isn't a loan application. It doesn't touch your credit score.
            </p>
          </div>
          <button className="btn-primary w-full" onClick={() => setStage('questions')}>
            Start assessment - about 10 questions
          </button>
          <div>
            <p className="text-[13px] font-semibold text-muted">…or try a sample borrower</p>
            <div className="mt-2 space-y-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  className="card w-full p-3 text-left hover:bg-paper2"
                  onClick={() => loadPersona(p.id)}
                >
                  <p className="text-[14px] font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{p.blurb}</p>
                </button>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-muted">
            Rates and rules are indicative of the Indian market in 2026 and documented in RULES.md at
            the repo root. A real offer can sit outside them.
          </p>
        </div>
      )}

      {stage === 'questions' && (
        <div className="mt-6">
          <div className="divide-y divide-rule">
            {mustQs.map((q) => (
              <Field key={q.id} q={withLabels(q, answers)} answers={answers} onChange={setAnswer} />
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <button className="btn-ghost" onClick={() => setStage('intro')}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!mustDone}
              onClick={() => setStage('results')}
            >
              {mustDone ? 'See my numbers' : `${missingRequired} required question${missingRequired > 1 ? 's' : ''} left`}
            </button>
          </div>
        </div>
      )}

      {stage === 'results' && result && (
        <div className="mt-6 space-y-4">
          <div className="no-print flex items-center gap-2 text-[13px]">
            <button className="btn-ghost px-2 py-1" onClick={() => setStage('questions')}>
              Edit answers
            </button>
            <button
              className="btn-ghost px-2 py-1"
              onClick={() => {
                setAnswers({});
                setStage('intro');
              }}
            >
              Start over
            </button>
          </div>

          <Outputs a={result} />
          <NegotiationCard a={result} />
          <QuoteChecker a={result} />

          <section className="card no-print p-4 sm:p-5">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowMore((s) => !s)}
            >
              <span className="font-display text-[18px] text-ink">
                Tighten these numbers · {result.missingAnswers.length} question
                {result.missingAnswers.length === 1 ? '' : 's'} left
              </span>
              <span className="text-accent">{showMore ? '−' : '+'}</span>
            </button>
            {showMore && (
              <>
                <p className="mt-1 text-[13px] text-muted">
                  Every answer here changes a number above. Skip any - the range just stays wide, and
                  the report says so.
                </p>
                <div className="mt-2 divide-y divide-rule">
                  {additionalQs.map((q) => (
                    <Field key={q.id} q={q} answers={answers} onChange={setAnswer} />
                  ))}
                </div>
              </>
            )}
          </section>

          {result.assumptionsUsed.length > 0 && (
            <section className="card no-print p-4 text-[13px]">
              <p className="font-semibold text-ink">Where this report is guessing</p>
              <ul className="mt-1.5 space-y-1 text-muted">
                {result.assumptionsUsed.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <footer className="no-print mt-10 border-t border-rule pt-4 text-[12px] text-muted">
        {QUESTIONS.length} questions in the bank · rules live in one file (src/rules/config.ts) · not
        financial advice.
      </footer>
    </div>
  );
}
