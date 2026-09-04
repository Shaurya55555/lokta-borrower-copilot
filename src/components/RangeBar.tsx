import type { Range } from '../rules/types';

interface Props {
  range: Range;
  format: (n: number) => string;
  /** optional scale bounds; defaults to a little outside the range */
  scaleMin?: number;
  scaleMax?: number;
  markerLabel?: string;
}

/** A range shown as a range - low ── point ── high - never a false-precision point. */
export function RangeBar({ range, format, scaleMin, scaleMax, markerLabel }: Props) {
  const lo = scaleMin ?? range.low - (range.high - range.low) * 0.35;
  const hi = scaleMax ?? range.high + (range.high - range.low) * 0.35;
  const span = Math.max(1, hi - lo);
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100))}%`;

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-[13px] text-muted tabular-nums">
        <span>{format(range.low)}</span>
        <span className="text-ink font-semibold">{markerLabel ?? format(range.point)}</span>
        <span>{format(range.high)}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-paper2">
        <div
          className="absolute h-2 rounded-full bg-accent-soft"
          style={{ left: pct(range.low), right: `calc(100% - ${pct(range.high)})` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent"
          style={{ left: pct(range.point) }}
        />
      </div>
    </div>
  );
}
