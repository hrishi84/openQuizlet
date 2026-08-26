/**
 * Gamification engine — XP, levels, daily goals, achievements, activity history.
 * Designed around the research-backed loop: immediate feedback → variable
 * rewards → streak loss aversion → visible mastery progress.
 */
import { loadDecks, saveDecks } from "./storage";
import type { Card, Deck } from "./types";
import { review } from "./srs";
import type { Grade } from "./srs";

/* ---------------- storage ---------------- */

const XP_KEY = "openquizlet.xp.v1";
const ACH_KEY = "openquizlet.achievements.v1";
const SETTINGS_KEY = "openquizlet.settings.v1";

export interface DayActivity {
  xp: number;
  answers: number;
  correct: number;
}

export interface XpState {
  total: number;
  /** date (YYYY-MM-DD) → activity */
  days: Record<string, DayActivity>;
  counters: {
    answers: number;
    correct: number;
    sessions: number;
    perfectSessions: number;
    bestMatchMs: number | null;
  };
}

const EMPTY_XP: XpState = {
  total: 0,
  days: {},
  counters: { answers: 0, correct: 0, sessions: 0, perfectSessions: 0, bestMatchMs: null },
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadXp(): XpState {
  try {
    const raw = localStorage.getItem(XP_KEY);
    return raw ? { ...EMPTY_XP, ...JSON.parse(raw) } : { ...EMPTY_XP };
  } catch {
    return { ...EMPTY_XP };
  }
}

/* ---------------- levels ---------------- */

/** Cumulative XP needed to reach level L: smooth quadratic-ish curve. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.6));
}

export function levelInfo(totalXp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp && level < 999) level++;
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    into: totalXp - cur,
    span: next - cur,
    pct: Math.min(100, ((totalXp - cur) / (next - cur)) * 100),
  };
}

export function levelTitle(level: number): string {
  const titles = ["Novice", "Apprentice", "Learner", "Scholar", "Adept", "Sharpshooter", "Mastermind", "Brainiac", "Sage", "Grandmaster", "Legend"];
  return titles[Math.min(titles.length - 1, Math.floor((level - 1) / 3))];
}

/* ---------------- settings ---------------- */

export interface Settings {
  sound: boolean;
  theme: "light" | "dark";
  dailyGoalXp: number;
  bgm: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, theme: "light", dailyGoalXp: 50, bgm: true };

export function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ---------------- achievements ---------------- */

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  check: (s: XpState, streakCount: number) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_step", name: "First Step", desc: "Answer your first question", emoji: "🌱", check: (s) => s.counters.answers >= 1 },
  { id: "century", name: "Century Club", desc: "Answer 100 questions", emoji: "💯", check: (s) => s.counters.answers >= 100 },
  { id: "millennium", name: "Millennial Mind", desc: "Answer 1,000 questions", emoji: "🧠", check: (s) => s.counters.answers >= 1000 },
  { id: "sharp", name: "Sharpshooter", desc: "90%+ accuracy over 200 answers", emoji: "🎯", check: (s) => s.counters.answers >= 200 && s.counters.correct / s.counters.answers >= 0.9 },
  { id: "session_10", name: "Warming Up", desc: "Complete 10 sessions", emoji: "🧗", check: (s) => s.counters.sessions >= 10 },
  { id: "perfect", name: "Flawless", desc: "Ace a test with a perfect score", emoji: "🏆", check: (s) => s.counters.perfectSessions >= 1 },
  { id: "perfect_5", name: "Perfectionist", desc: "5 perfect sessions", emoji: "💎", check: (s) => s.counters.perfectSessions >= 5 },
  { id: "streak_3", name: "Habit Seed", desc: "3-day streak", emoji: "📅", check: (_s, st) => st >= 3 },
  { id: "streak_7", name: "Week Warrior", desc: "7-day streak", emoji: "⚡", check: (_s, st) => st >= 7 },
  { id: "streak_30", name: "Unstoppable", desc: "30-day streak", emoji: "🚀", check: (_s, st) => st >= 30 },
  { id: "match_fast", name: "Speed Demon", desc: "Clear Match in under 20s", emoji: "🏎️", check: (s) => s.counters.bestMatchMs != null && s.counters.bestMatchMs < 20000 },
  { id: "level_5", name: "Rising Star", desc: "Reach level 5", emoji: "⭐", check: (s) => levelInfo(s.total).level >= 5 },
  { id: "level_10", name: "Double Digits", desc: "Reach level 10", emoji: "🌟", check: (s) => levelInfo(s.total).level >= 10 },
  { id: "night_owl", name: "Night Owl", desc: "Study after 11pm", emoji: "🦉", check: () => new Date().getHours() >= 23 || new Date().getHours() < 4 },
  { id: "early_bird", name: "Early Bird", desc: "Study before 7am", emoji: "🌅", check: () => { const h = new Date().getHours(); return h >= 5 && h < 7; } },
];

export function loadAchievements(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACH_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveAchievements(ids: string[]) {
  localStorage.setItem(ACH_KEY, JSON.stringify(ids));
}

/* ---------------- the award pipeline ---------------- */

export interface AwardInput {
  xp?: number;
  answers?: number;
  correct?: number;
  sessionComplete?: boolean;
  perfectSession?: boolean;
  matchTimeMs?: number;
}

export interface AwardResult {
  state: XpState;
  xpGained: number;
  leveledUp: null | { from: number; to: number; title: string };
  unlocked: AchievementDef[];
  goalCompleted: boolean;
  streakMilestone: null | number;
}

const MILESTONES = [3, 7, 14, 30, 50, 100, 365];

/**
 * Central hook called after study events. Updates XP/history/counters and
 * returns everything the UI needs to celebrate.
 */
export function award(input: AwardInput): AwardResult {
  const before = loadXp();
  const beforeLevel = levelInfo(before.total).level;
  const beforeDayXp = before.days[todayKey()]?.xp ?? 0;

  const s: XpState = structuredClone(before);
  const k = todayKey();
  s.days[k] = s.days[k] ?? { xp: 0, answers: 0, correct: 0 };
  const day = s.days[k];

  let xpGained = input.xp ?? 0;
  s.total += xpGained;
  day.xp += xpGained;
  if (input.answers) {
    s.counters.answers += input.answers;
    day.answers += input.answers;
  }
  if (input.correct) {
    s.counters.correct += input.correct;
    day.correct += input.correct;
  }
  if (input.sessionComplete) s.counters.sessions += 1;
  if (input.perfectSession) s.counters.perfectSessions += 1;
  if (input.matchTimeMs != null && (s.counters.bestMatchMs == null || input.matchTimeMs < s.counters.bestMatchMs))
    s.counters.bestMatchMs = input.matchTimeMs;

  // prune history older than 90 days
  const cutoff = Date.now() - 90 * 86400000;
  for (const key of Object.keys(s.days)) {
    if (new Date(key + "T12:00:00").getTime() < cutoff) delete s.days[key];
  }

  localStorage.setItem(XP_KEY, JSON.stringify(s));

  // notify listeners (app bar level chip, goal ring) so progress updates instantly
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("oq:xp"));

  const afterLevel = levelInfo(s.total).level;
  const unlocked = ACHIEVEMENTS.filter((a) => !loadAchievements().includes(a.id) && a.check(s, currentStreakFromDays(s)));
  if (unlocked.length) saveAchievements([...loadAchievements(), ...unlocked.map((a) => a.id)]);

  const afterDayXp = day.xp;
  const goalCompleted =
    beforeDayXp < loadSettings().dailyGoalXp && afterDayXp >= loadSettings().dailyGoalXp;

  // streak milestones come via recordActivity in storage.ts; detected here for celebration
  const streak = currentStreakFromDays(s);
  const streakMilestone = MILESTONES.includes(streak) ? streak : null;

  return {
    state: s,
    xpGained,
    leveledUp:
      afterLevel > beforeLevel
        ? { from: beforeLevel, to: afterLevel, title: levelTitle(afterLevel) }
        : null,
    unlocked,
    goalCompleted,
    streakMilestone,
  };
}

function currentStreakFromDays(s: XpState): number {
  let streak = 0;
  const d = new Date();
  // allow today to be empty without breaking yesterday's streak
  if (!s.days[todayKey(d)]) d.setDate(d.getDate() - 1);
  for (;;) {
    if (s.days[todayKey(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function lastNDays(n: number): { date: string; label: string; activity: DayActivity }[] {
  const s = loadXp();
  const out: { date: string; label: string; activity: DayActivity }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push({
      date: todayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: "short" })[0],
      activity: s.days[todayKey(d)] ?? { xp: 0, answers: 0, correct: 0 },
    });
  }
  return out;
}

/* ---------------- card answer helper (XP + FSRS + stats in one call) ---------- */

export function gradeCard(deck: Deck, cardId: string, correct: boolean, quality: Grade): void {
  deck.cards = deck.cards.map((c) => {
    if (c.id !== cardId) return c;
    const { mem, due } = review(c.mem, quality);
    const next: Card = {
      ...c,
      mem,
      srs: {
        ...c.srs,
        due,
        interval: Math.round(intervalDaysFromMem(mem)),
        reps: c.srs.reps + 1,
        lapses: c.srs.lapses + (correct ? 0 : 1),
      },
      stats: {
        correct: (c.stats?.correct ?? 0) + (correct ? 1 : 0),
        wrong: (c.stats?.wrong ?? 0) + (correct ? 0 : 1),
      },
    };
    return next;
  });
  saveDecks((() => {
    const all = loadDecks();
    const i = all.findIndex((d) => d.id === deck.id);
    if (i >= 0) all[i] = { ...deck, updatedAt: Date.now() };
    return all;
  })());
}

function intervalDaysFromMem(mem: { s: number }): number {
  const FACTOR = 19 / 81;
  const DECAY = -0.5;
  return Math.max(1 / 48, (mem.s / FACTOR) * (Math.pow(0.9, 1 / DECAY) - 1));
}
