import * as store from "./storage";
import { award } from "./gamification";
import type { AwardResult } from "./gamification";
import { sounds } from "./sound";

export const XP_CORRECT = 10;
export const XP_WRONG = 2;
export const SESSION_BONUS = 25;
export const PERFECT_BONUS = 50;

/** Record one answer: progress stats + streak + XP + feedback sound. */
export function reportAnswer(deckId: string, cardId: string, correct: boolean): AwardResult {
  store.markAnswer(deckId, cardId, correct);
  store.recordActivity();
  const res = award({ xp: correct ? XP_CORRECT : XP_WRONG, answers: 1, correct: correct ? 1 : 0 });
  if (correct) sounds.correct();
  else sounds.wrong();
  return res;
}

/** End-of-session reward. */
export function reportSession(opts: { perfect?: boolean; matchTimeMs?: number } = {}): AwardResult {
  const res = award({
    xp: SESSION_BONUS + (opts.perfect ? PERFECT_BONUS : 0),
    sessionComplete: true,
    perfectSession: opts.perfect,
    matchTimeMs: opts.matchTimeMs,
  });
  return res;
}

/** Attach number-key shortcuts (1-4) to option buttons. */
export function optionKeyHandler(count: number, onPick: (i: number) => void) {
  return (e: React.KeyboardEvent) => {
    const n = parseInt(e.key, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= count) onPick(n - 1);
  };
}
