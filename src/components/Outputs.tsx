import type { ReactNode } from 'react';
import type { Assessment } from '../rules/types';
import { RangeBar } from './RangeBar';
import { inr, inrShort, months, pct } from './format';

const VERDICT_STYLE: Record<Assessment['verdict']['call'], { chip: string; ring: string; word: string }> = {
  borrow: { chip: 'bg-good/10 text-good border-good/30', ring: 'border-good/40', word: 'Borrow' },
  borrow_less: { chip: 'bg-warn/10 text-warn border-warn/30', ring: 'border-warn/40', word: 'Borrow less' },
  do_not_borrow: { chip: 'bg-bad/10 text-bad border-bad/30', ring: 'border-bad/40', word: "Don't borrow" },
};

function Block({ tag, title, children }: { tag: string; title: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[12px] font-semibold text-accent">{tag}</span>
        <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function Outputs({ a }: { a: Assessment }) {
  const v = VERDICT_STYLE[a.verdict.call];
  const rec = a.outflow.atRecommendedAmount;

  return (
    <div className="space-y-3">
      {/* O1 */}
      <section className={`card border-2 ${v.ring} p-4 sm:p-5`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-accent">O1</span>
          <span className={`chip ${v.chip}`}>{v.word}</span>
          <span className="ml-auto text-[12px] text-muted">
            confidence: <b className="text-ink">{a.confidence}</b>
          </span>
        </div>
        <p className="mt-2 font-display text-[20px] leading-snug text-ink">{a.verdict.headline}</p>
        <p className="mt-1.5 text-[14px] text-muted">{a.verdict.why}</p>
        {a.verdict.constructivePath && (
          <ul className="mt-3 space-y-1.5 border-t border-rule pt-3 text-[14px]">
            {a.verdict.constructivePath.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Productive-loan check - a companion to O1, not one of the four required
          outputs, so it is labelled separately and never given an O-number. */}
      {a.productiveCheck && (
        <section className={`card p-4 sm:p-5 ${a.productiveCheck.coversEmi ? 'border-good/30' : 'border-warn/30'} border`}>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
            Does this loan pay for itself?
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[11px] text-muted">Expected return</p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums">
                {inr(a.productiveCheck.expectedMonthlyReturn)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">EMI</p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{inr(a.productiveCheck.emiAtThisAmount)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Monthly surplus</p>
              <p className={`mt-0.5 text-[16px] font-semibold tabular-nums ${a.productiveCheck.coversEmi ? 'text-good' : 'text-bad'}`}>
                {a.productiveCheck.coversEmi ? '+' : ''}
                {inr(a.productiveCheck.monthlySurplus)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-muted">{a.productiveCheck.note}</p>
        </section>
      )}

      {/* O2 */}
      <Block tag="O2" title="How much you can borrow">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-md p-3 ${a.maxAmount.useThis === 'lender' ? 'bg-accent-soft' : 'bg-paper2'}`}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">A lender will likely sanction</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">
              {inrShort(a.maxAmount.lenderWillSanction.point)}
            </p>
            <RangeBar range={a.maxAmount.lenderWillSanction} format={inrShort} />
          </div>
          <div className={`rounded-md p-3 ${a.maxAmount.useThis === 'borrower' ? 'bg-accent-soft' : 'bg-paper2'}`}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">You can safely carry</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">
              {inrShort(a.maxAmount.borrowerCanCarry.point)}
            </p>
            <RangeBar range={a.maxAmount.borrowerCanCarry} format={inrShort} />
          </div>
        </div>
        <p className="mt-3 rounded-md bg-paper2 p-3 text-[14px]">
          <b>Use the {a.maxAmount.useThis === 'borrower' ? '"safely carry"' : 'lender'} number.</b>{' '}
          {a.maxAmount.why}
        </p>
      </Block>

      {/* O3 */}
      <Block tag="O3" title="An indicative fair-rate range for you">
        <p className="mb-2 text-[12px] text-muted">
          An estimate from your profile against modelled market bands - not a lender quote, and
          not a guarantee any lender will offer it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Nominal rate band</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">
              {pct(a.rate.nominalBand.low)} – {pct(a.rate.nominalBand.high)}
            </p>
            <RangeBar
              range={a.rate.nominalBand}
              format={pct}
              markerLabel={pct(a.rate.nominalBand.point)}
            />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">All-in APR (with fees)</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">
              {pct(a.rate.aprBand.low)} – {pct(a.rate.aprBand.high)}
            </p>
            <RangeBar range={a.rate.aprBand} format={pct} markerLabel={pct(a.rate.aprBand.point)} />
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-[13px] text-muted">
          {a.rate.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      </Block>

      {/* O4 */}
      <Block tag="O4" title="The EMI to agree to - and no more">
        <div className="rounded-md bg-accent-soft p-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Monthly EMI ceiling</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums">{inr(a.outflow.emiCeiling.point)}</p>
          <RangeBar range={a.outflow.emiCeiling} format={inr} />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 pr-3 font-semibold">On {inrShort(rec.amount)}</th>
                <th className="py-1 pr-3 font-semibold">Tenure</th>
                <th className="py-1 pr-3 font-semibold">EMI</th>
                <th className="py-1 font-semibold">Total interest</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-t border-rule">
                <td className="py-1.5 pr-3">Prudent</td>
                <td className="py-1.5 pr-3">{months(rec.prudent.tenureMonths)}</td>
                <td className="py-1.5 pr-3">{inr(rec.prudent.emi)}</td>
                <td className="py-1.5 text-good">{inr(rec.prudent.totalInterest)}</td>
              </tr>
              <tr className="border-t border-rule">
                <td className="py-1.5 pr-3">Maximum</td>
                <td className="py-1.5 pr-3">{months(rec.maximum.tenureMonths)}</td>
                <td className="py-1.5 pr-3">{inr(rec.maximum.emi)}</td>
                <td className="py-1.5 text-bad">{inr(rec.maximum.totalInterest)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2">
          {a.outflow.stress.map((s, i) => (
            <div key={i} className="rounded-md border border-rule p-2.5 text-[13px]">
              <div className="flex items-center gap-2">
                <span
                  className={`chip ${
                    s.outcome === 'comfortable'
                      ? 'bg-good/10 text-good border-good/30'
                      : s.outcome === 'tight'
                        ? 'bg-warn/10 text-warn border-warn/30'
                        : 'bg-bad/10 text-bad border-bad/30'
                  }`}
                >
                  {s.outcome}
                </span>
                <b>{s.label}</b>
                <span className="ml-auto text-muted tabular-nums">FOIR {Math.round(s.foir * 100)}%</span>
              </div>
              <p className="mt-1 text-muted">{s.scenario}</p>
              <p className="mt-0.5">{s.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] text-muted">{a.outflow.why}</p>
      </Block>
    </div>
  );
}
