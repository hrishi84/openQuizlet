import type { Card } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n distractor definitions/terms distinct from `exclude`. */
export function distractors(pool: Card[], exclude: string, n: number): string[] {
  const options = [...new Set(pool.map((c) => c.definition).filter((d) => d && d !== exclude))];
  return shuffle(options).slice(0, n);
}

/** Loose answer check: case/punctuation insensitive. */
export function looseMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  return norm(a) === norm(b) || (a.trim() !== "" && norm(b).includes(norm(a)));
}
