import type { Question } from '../questions/schema';
import type { Answers } from '../rules/types';

interface Props {
  q: Question;
  answers: Answers;
  onChange: (id: keyof Answers, value: unknown) => void;
}

const money = (n: number) => '₹' + n.toLocaleString('en-IN');

export function Field({ q, answers, onChange }: Props) {
  const raw = answers[q.id];

  return (
    <div className="py-3">
      <label className="block text-[15px] font-semibold text-ink" htmlFor={String(q.id)}>
        {q.label}
      </label>
      {q.help && <p className="mt-0.5 text-[13px] text-muted">{q.help}</p>}

      <div className="mt-2">
        {q.type === 'select' && (
          <select
            id={String(q.id)}
            className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px]"
            value={(raw as string) ?? ''}
            onChange={(e) => onChange(q.id, e.target.value || undefined)}
          >
            <option value="">Select…</option>
            {q.choices!.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        {q.type === 'boolean' && (
          <div className="flex gap-2">
            {[
              { v: true, l: 'Yes' },
              { v: false, l: 'No' },
            ].map(({ v, l }) => (
              <button
                key={l}
                type="button"
                className={`btn ${raw === v ? 'btn-primary' : 'btn-ghost'} flex-1`}
                onClick={() => onChange(q.id, raw === v ? undefined : v)}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {(q.type === 'money' || q.type === 'number' || q.type === 'percent') && (
          <div className="flex items-center gap-2">
            {q.type === 'money' && <span className="text-muted">₹</span>}
            <input
              id={String(q.id)}
              type="number"
              inputMode="numeric"
              className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[15px] tabular-nums"
              value={raw === undefined ? '' : q.type === 'percent' ? Math.round((raw as number) * 100) : (raw as number)}
              min={q.min}
              max={q.max}
              placeholder={q.skipNote ? 'optional' : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return onChange(q.id, undefined);
                const num = Number(val);
                onChange(q.id, q.type === 'percent' ? Math.max(0, Math.min(1, num / 100)) : num);
              }}
            />
            {q.type === 'percent' && <span className="text-muted">%</span>}
          </div>
        )}
      </div>

      {q.type === 'money' && typeof raw === 'number' && raw > 0 && (
        <p className="mt-1 text-[12px] text-muted tabular-nums">{money(raw)}</p>
      )}
      {q.movesOutput && q.tier === 'additional' && (
        <p className="mt-1 text-[12px] text-accent">Moves: {q.movesOutput}</p>
      )}
      {q.skipNote && raw === undefined && <p className="mt-1 text-[12px] text-warn">{q.skipNote}</p>}
    </div>
  );
}
