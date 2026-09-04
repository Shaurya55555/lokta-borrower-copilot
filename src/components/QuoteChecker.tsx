import { useMemo, useState } from 'react';
import type { Assessment } from '../rules/types';
import { checkQuote } from '../rules/quoteCheck';
import { inr, pct } from './format';

/**
 * "Already have a lender's offer? Check it before you sign." A thin UI layer
 * over checkQuote() - it reuses the SAME finance math (finance.ts) as the rest
 * of the app, so a quote is judged against the fair band by the identical
 * yardstick, not a second pricing model.
 */
export function QuoteChecker({ a }: { a: Assessment }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(a.outflow.atRecommendedAmount.amount);
  const [ratePct, setRatePct] = useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = useState(a.outflow.atRecommendedAmount.prudent.tenureMonths);
  const [feeRupees, setFeeRupees] = useState<number | ''>('');
  const [otherChargesRupees, setOtherChargesRupees] = useState<number | ''>('');

  const result = useMemo(() => {
    if (amount <= 0 || ratePct === '' || ratePct <= 0 || tenureMonths <= 0) return null;
    return checkQuote(a.rate, {
      amount,
      ratePct,
      tenureMonths,
      feeRupees: feeRupees === '' ? 0 : feeRupees,
      otherChargesRupees: otherChargesRupees === '' ? 0 : otherChargesRupees,
    });
  }, [a.rate, amount, ratePct, tenureMonths, feeRupees, otherChargesRupees]);

  const verdictStyle =
    result?.verdict === 'above_range'
      ? 'border-bad/40 bg-bad/5'
      : result?.verdict === 'below_range'
        ? 'border-good/40 bg-good/5'
        : 'border-rule bg-paper2';

  return (
    <section className="card no-print p-4 sm:p-5">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-display text-[18px] text-ink">Already have a lender's offer? Check it.</span>
        <span className="text-accent">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-[13px] text-muted">
            Enter exactly what the lender quoted. This runs the same all-in-APR math used above, so it is
            compared against your fair band on identical terms.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[13px]">
              Loan amount
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </label>
            <label className="text-[13px]">
              Quoted rate (% p.a.)
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
                value={ratePct}
                placeholder="e.g. 14"
                onChange={(e) => setRatePct(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
            <label className="text-[13px]">
              Tenure (months)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value) || 0)}
              />
            </label>
            <label className="text-[13px]">
              Processing fee (₹)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
                value={feeRupees}
                placeholder="0"
                onChange={(e) => setFeeRupees(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
            <label className="col-span-2 text-[13px]">
              Any other one-time charge, e.g. bundled insurance (₹)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
                value={otherChargesRupees}
                placeholder="0"
                onChange={(e) => setOtherChargesRupees(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          </div>

          {result && (
            <div className={`mt-4 rounded-md border-2 p-3.5 ${verdictStyle}`}>
              <p className="font-display text-[17px] text-ink">{result.headline}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-muted">Sanctioned amount</dt>
                <dd className="text-right font-semibold tabular-nums">{inr(result.sanctionedAmount)}</dd>
                <dt className="text-muted">Net amount you'd actually receive</dt>
                <dd className="text-right font-semibold tabular-nums">{inr(result.netDisbursed)}</dd>
                <dt className="text-muted">Their EMI</dt>
                <dd className="text-right font-semibold tabular-nums">{inr(result.emi)}</dd>
                <dt className="text-muted">Total you'd repay over the full tenure</dt>
                <dd className="text-right font-semibold tabular-nums">{inr(result.totalRepayment)}</dd>
                <dt className="text-muted">All-in APR on this quote</dt>
                <dd className="text-right font-semibold tabular-nums">{pct(result.apr)}</dd>
                <dt className="text-muted">Your fair APR range</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {pct(a.rate.aprBand.low)}-{pct(a.rate.aprBand.high)}
                </dd>
              </dl>
              <p className="mt-2 text-[12px] text-muted">
                Sanctioned amount is what the lender approves. Net received is less, once fees are
                taken out upfront. Total repayment is every EMI added up - the true cost of saying
                yes. APR folds all three into one comparable number.
              </p>
              <p className="mt-2 text-[13px]">{result.note}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
