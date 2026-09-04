import type { Assessment } from '../rules/types';

/**
 * The one screen the borrower holds up to a lender. Deliberately plain, high
 * contrast, printable. Everything on it traces back to an answer.
 */
export function NegotiationCard({ a }: { a: Assessment }) {
  const c = a.card;
  const stop = a.verdict.call === 'do_not_borrow';

  return (
    <div className="card border-2 border-accent p-5 print:border-black" id="negotiation-card">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          Negotiation Card
        </p>
        <button
          type="button"
          className="btn-ghost no-print px-2 py-1 text-[12px]"
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>

      <h2 className="mt-2 font-display text-[22px] text-ink">{stop ? 'Before I sign anything' : c.product}</h2>

      {!stop && (
        <>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-muted">My position</p>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-muted">I'm asking for</dt>
          <dd className="text-right font-semibold tabular-nums">{c.amount}</dd>
          <dt className="text-muted">Indicative rate</dt>
          <dd className="text-right font-semibold tabular-nums">{c.fairRate}</dd>
          <dt className="text-muted">Indicative all-in APR</dt>
          <dd className="text-right font-semibold tabular-nums">{c.fairApr}</dd>
          <dt className="text-muted">My EMI ceiling</dt>
          <dd className="text-right font-semibold tabular-nums">{c.emiCeiling}</dd>
          <dt className="text-muted">Tenure</dt>
          <dd className="text-right font-semibold tabular-nums">{c.tenure}</dd>
        </dl>
        </>
      )}

      <ul className="mt-4 space-y-2 border-t border-rule pt-3 text-[14px]">
        {c.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-accent">▪</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-muted">Walk-away condition</p>
      <p className="mt-1.5 rounded-md bg-accent-soft p-3 text-[14px] font-semibold text-accent">
        {c.walkAwayLine}
      </p>

      {!stop && (
        <div className="mt-4 border-t border-rule pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Ask the lender</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13px] marker:text-accent marker:font-semibold">
            <li>What is the all-in APR, not just the interest rate?</li>
            <li>What is the processing fee, and does that include GST?</li>
            <li>What amount will actually be credited to my account, after fees?</li>
            <li>Is this rate fixed or floating, and how does it reset?</li>
            <li>What are the prepayment or foreclosure charges?</li>
            <li>Is any insurance bundled into the loan? Can I decline it?</li>
          </ol>
        </div>
      )}
    </div>
  );
}
