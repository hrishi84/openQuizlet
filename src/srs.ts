/**
 * FSRS-lite — a faithful implementation of the FSRS-4.5 three-component memory
 * model (Difficulty, Stability, Retrievability) with published default weights.
 *
 * Benchmarks (expertium.github.io) show FSRS achieves the same retention as
 * SM-2 with ~20-30% fewer reviews. We use fixed default weights; per-user
 * parameter optimization is out of scope for a local-first app (it needs
 * ~1000 reviews of history to fit).
 *
 * Model:
 *   D ∈ [1,10]  — how hard this card is for you
 *   S ∈ days    — time for recall probability to drop to 90%
 *   R ∈ [0,1]   — current recall probability
 */

export type Grade = 1 | 2 | 3 | 4; // again, hard, good, easy

/** FSRS-4.5 default parameters */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

/** power-law forgetting curve factor (FSRS-4.5) */
const DECAY = -0.5;
const FACTOR = 19 / 81;

export interface MemoryState {
  d: number;
  s: number;
  /** epoch ms of last review */
  last: number;
  due: number;
}

export const DEFAULT_RETENTION = 0.9;
/** days until a card becomes a leech */
export const LEECH_LAPSES = 4;

export function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

/** Current recall probability given elapsed days. */
export function retrievability(m: MemoryState, now = Date.now()): number {
  const t = Math.max(0, (now - m.last) / 86400000);
  return Math.pow(1 + (FACTOR * t) / m.s, DECAY);
}

function initD(grade: Grade): number {
  return clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10);
}

function nextD(d: number, grade: Grade): number {
  const dd = -W[6] * (grade - 3);
  // mean reversion toward initial difficulty keeps extreme values in check
  const dNew = clamp(d + dd, 1, 10);
  return clamp(W[7] * initD(4) + (1 - W[7]) * dNew, 1, 10);
}

function initS(grade: Grade): number {
  return W[grade - 1];
}

function nextS(m: MemoryState, grade: Grade): number {
  const r = retrievability(m);
  if (grade === 1) {
    // lapse
    return clamp(
      W[11] * Math.pow(m.d, -W[12]) * (Math.pow(m.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)),
      0.1,
      36500,
    );
  }
  let s =
    m.s *
    (1 +
      Math.exp(W[8]) *
        (11 - m.d) *
        Math.pow(m.s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1));
  if (grade === 2) s *= W[15]; // hard penalty
  if (grade === 4) s *= W[16]; // easy bonus
  return clamp(s, 0.1, 36500);
}

/** Interval in days that brings recall down to `retention`. */
export function intervalFor(s: number, retention = DEFAULT_RETENTION): number {
  return Math.max(1 / 48, (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1));
}

export function review(
  m: MemoryState | undefined,
  grade: Grade,
  now = Date.now(),
): { mem: MemoryState; due: number; intervalDays: number } {
  const isFirst = m == null;
  const s = isFirst ? initS(grade) : nextS(m, grade);
  const intervalDays = isFirst ? intervalFor(s) : intervalFor(s);
  // same-day relearning for lapses: due in 10 minutes instead of tomorrow
  const due =
    grade === 1 && !isFirst ? now + 10 * 60000 : now + intervalDays * 86400000;
  const mem: MemoryState = {
    d: isFirst ? initD(grade) : nextD(m.d, grade),
    s,
    last: now,
    due,
  };
  return { mem, due, intervalDays };
}

/** Human-friendly interval label. */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
