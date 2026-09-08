import { useEffect, useRef, useState } from 'react';
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
  const resultsRef = useRef<HTMLDivElement>(null);

  // On stage change, put the user at the right place instead of leaving them
  // wherever they had scrolled to on the previous screen.
  useEffect(() => {
    if (stage === 'results') {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [stage]);

  const jump = (id: string) => {
    if (id === 'tighten') setShowMore(true);
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const setAnswer = (id: keyof Answers, value: unknown) =>
    setAnswers((prev) => {
      const next: Answers = { ...prev, [id]: value };
      if (value === undefined) delete next[id];
      return next;
    });

  // Everything below is derived from `answers` on each render. assess() is pure
  // arithmetic over a dozen small functions - cheap enough to run every render,
  // and keeping it un-memoised sidesteps stale-dependency bugs entirely.
  const hasAnswers = Object.keys(answers).length > 0;
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
      <header className="no-print flex items-center justify-between border-b border-rule pb-3">
        <button
          type="button"
          onClick={() => setStage('intro')}
          className="group flex items-center gap-2"
          title="Home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule text-accent transition-colors group-hover:border-accent group-hover:bg-accent-soft">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 4l9 6.5" />
              <path d="M5 9.5V20h14V9.5" />
            </svg>
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted group-hover:text-accent">
            Borrower Copilot
          </span>
        </button>
        {stage !== 'intro' && (
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {stage === 'results' ? 'Your report' : 'The basics'}
          </span>
        )}
      </header>

      {stage === 'intro' && (
        <div className="mt-10 sm:mt-14">
          {/* Hero */}
          <div className="text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Borrower-side loan self-assessment
            </p>
            <h1 className="mx-auto mt-4 max-w-xl font-display leading-[1.05] text-ink">
              <span className="block text-[24px] italic text-muted sm:text-[30px]">
                Should you take this loan?
              </span>
              <span className="mt-1 block text-[36px] font-semibold sm:text-[50px]">
                See your real numbers first.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
              Four answers from what you tell it. No login, no credit check, nothing stored.
            </p>
            <div className="mt-7 flex flex-col items-center gap-2">
              <button className="btn-primary px-6" onClick={() => setStage('questions')}>
                {hasAnswers ? 'Resume where you left off →' : 'Start assessment →'}
              </button>
              {hasAnswers ? (
                <button
                  className="text-[12px] font-semibold text-muted hover:text-accent"
                  onClick={() => setAnswers({})}
                >
                  or clear my answers and start fresh
                </button>
              ) : (
                <span className="text-[12px] text-muted">about 9 quick questions · around 2 minutes</span>
              )}
            </div>
          </div>

          {/* What you get */}
          <div className="mt-12 border-t border-rule pt-6">
            <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              What you get
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-rule">
              {[
                ['01', 'Verdict', "Borrow, borrow less, or don't - with the reason it lands there"],
                ['02', 'How much', 'What a lender may sanction vs. what you can safely carry'],
                ['03', 'Fair rate', 'A rate band, and the all-in APR once fees and GST are in'],
                ['04', 'EMI ceiling', 'A monthly cap to hold the line on, plus a one-page Negotiation Card'],
              ].map(([n, t, d]) => (
                <div key={n} className="sm:px-4 sm:first:pl-0 sm:last:pr-0">
                  <p className="font-mono text-[12px] font-semibold text-accent">{n}</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">{t}</p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sample borrowers */}
          <div className="mt-10 border-t border-rule pt-6">
            <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              Or preview with a sample borrower
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  className="card block h-full w-full p-3 text-left transition-colors hover:border-accent/40 hover:bg-paper2"
                  onClick={() => loadPersona(p.id)}
                >
                  <p className="text-[13px] font-semibold text-ink">{p.name}</p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">{p.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-md text-center text-[12px] leading-relaxed text-muted">
            Not a loan application, and it doesn't touch your credit score. Rates and rules are
            indicative of the Indian market in 2026 and documented in RULES.md; a real offer can sit
            outside them.
          </p>
        </div>
      )}

      {stage === 'questions' && (
        <div className="mt-6">
          <div className="rounded-md bg-paper2 px-3 py-2 text-[13px] text-muted">
            <b className="text-ink">The basics.</b> Just enough to produce all four answers. You can
            fine-tune with optional questions on the results page.
          </div>
          <div className="mt-2 divide-y divide-rule">
            {mustQs.map((q) => (
              <Field key={q.id} q={withLabels(q, answers)} answers={answers} onChange={setAnswer} />
            ))}
          </div>

          <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur">
            <button className="btn-ghost" onClick={() => setStage('intro')}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!mustDone}
              onClick={() => setStage('results')}
            >
              {mustDone ? 'See my numbers →' : `${missingRequired} required question${missingRequired > 1 ? 's' : ''} left`}
            </button>
          </div>
        </div>
      )}

      {stage === 'results' && result && (
        <div ref={resultsRef} className="mt-6 space-y-4">
          {/* Jump bar - a map of the report, always reachable while scrolling. */}
          <div className="no-print sticky top-0 z-20 -mx-4 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <nav className="flex flex-wrap gap-1.5 text-[12px]">
                {[
                  ['o1', 'Verdict'],
                  ['o2', 'Amount'],
                  ['o3', 'Rate'],
                  ['o4', 'EMI'],
                  ['card', 'Card'],
                  ['quote', 'Check a quote'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => jump(id)}
                    className="rounded-full border border-rule px-2.5 py-1 font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="ml-auto flex gap-1.5 text-[12px]">
                <button
                  className="rounded-full border border-rule px-2.5 py-1 font-semibold text-muted hover:border-accent hover:text-accent"
                  onClick={() => setStage('questions')}
                >
                  Edit answers
                </button>
                <button
                  className="rounded-full border border-rule px-2.5 py-1 font-semibold text-muted hover:border-accent hover:text-accent"
                  onClick={() => {
                    setAnswers({});
                    setStage('intro');
                  }}
                >
                  Start over
                </button>
              </div>
            </div>
          </div>

          {/* Prominent "these are wide - tighten them" prompt, above the results. */}
          {result.missingAnswers.length > 0 && (
            <button
              onClick={() => jump('tighten')}
              className="no-print flex w-full items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3 text-left transition-colors hover:border-accent/60"
            >
              <span className="text-[20px] leading-none">⟳</span>
              <span>
                <span className="block text-[14px] font-semibold text-ink">
                  These are wide ranges - you have answered the basics only.
                </span>
                <span className="mt-0.5 block text-[13px] font-semibold text-accent">
                  Answer {result.missingAnswers.length} more question
                  {result.missingAnswers.length === 1 ? '' : 's'} to tighten every number below ↓
                </span>
              </span>
            </button>
          )}

          <Outputs a={result} />

          <div id="card" className="scroll-mt-16">
            <NegotiationCard a={result} />
          </div>
          <div id="quote" className="scroll-mt-16">
            <QuoteChecker a={result} />
          </div>

          <section id="tighten" className="card no-print scroll-mt-16 border-accent/30 p-4 sm:p-5">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowMore((s) => !s)}
            >
              <span className="font-display text-[18px] text-ink">
                Tighten these numbers · {result.missingAnswers.length} question
                {result.missingAnswers.length === 1 ? '' : 's'} left
              </span>
              <span className="text-[18px] text-accent">{showMore ? '−' : '+'}</span>
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
