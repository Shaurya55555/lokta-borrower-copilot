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
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-muted">I'm asking for</dt>
          <dd className="text-right font-semibold tabular-nums">{c.amount}</dd>
          <dt className="text-muted">Fair rate</dt>
          <dd className="text-right font-semibold tabular-nums">{c.fairRate}</dd>
          <dt className="text-muted">Fair all-in APR</dt>
          <dd className="text-right font-semibold tabular-nums">{c.fairApr}</dd>
          <dt className="text-muted">My EMI ceiling</dt>
          <dd className="text-right font-semibold tabular-nums">{c.emiCeiling}</dd>
          <dt className="text-muted">Tenure</dt>
          <dd className="text-right font-semibold tabular-nums">{c.tenure}</dd>
        </dl>
      )}

      <ul className="mt-4 space-y-2 border-t border-rule pt-3 text-[14px]">
        {c.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-accent">▪</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-md bg-accent-soft p-3 text-[14px] font-semibold text-accent">
        {c.walkAwayLine}
      </p>
    </div>
  );
}
