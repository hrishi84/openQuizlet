export interface CardStats {
  correct: number;
  wrong: number;
}

/** FSRS memory state */
export interface Mem {
  d: number;
  s: number;
  last: number;
  due: number;
}

export interface Card {
  id: string;
  term: string;
  definition: string;
  /** legacy SM-2 state (migrated to mem) */
  srs: {
    ease: number; // easiness factor
    interval: number; // days
    due: number; // epoch ms
    reps: number;
    lapses: number;
  };
  /** FSRS memory state (preferred over srs when present) */
  mem?: Mem;
  /** Lifetime answer stats, used for progress tracking */
  stats?: CardStats;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  cards: Card[];
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  deckIds: string[];
}

export function newSrs(now = Date.now()) {
  return { ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0 };
}

export function newCard(term = "", definition = ""): Card {
  return { id: uid(), term, definition, srs: newSrs() };
}

export function newDeck(name: string): Deck {
  return {
    id: uid(),
    name,
    description: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: [],
  };
}

export function newFolder(name: string): Folder {
  return { id: uid(), name, createdAt: Date.now(), deckIds: [] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Number of correct answers needed before a card counts as "learned". */
export const LEARNED_THRESHOLD = 2;

export function isLearned(card: Card): boolean {
  return (card.stats?.correct ?? 0) >= LEARNED_THRESHOLD;
}

/** A leech is a card that keeps slipping away — it needs rewording or extra attention. */
export function isLeech(card: Card): boolean {
  return (card.srs?.lapses ?? 0) >= 4; // matches srs.LEECH_LAPSES
}

export function deckProgress(deck: Deck): number {
  if (deck.cards.length === 0) return 0;
  return deck.cards.filter(isLearned).length / deck.cards.length;
}

/** Weighted progress across a set of decks (0-100). */
export function combinedProgress(decks: Deck[]): number {
  const total = decks.reduce((n, d) => n + d.cards.length, 0);
  if (total === 0) return 0;
  const learned = decks.reduce((n, d) => n + d.cards.filter(isLearned).length, 0);
  return Math.round((learned / total) * 100);
}

/**
 * SM-2 inspired scheduling. quality: 0-5 (again=1, hard=3, good=4, easy=5)
 */
export function schedule(card: Card, quality: number, now = Date.now()): Card {
  const s = { ...card.srs };
  if (quality < 3) {
    s.lapses += 1;
    s.reps = 0;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now;
  } else {
    s.reps += 1;
    s.ease = Math.min(2.8, Math.max(1.3, s.ease + (0.1 - (5 - quality) * 0.08)));
    if (s.reps === 1) s.interval = 1;
    else if (s.reps === 2) s.interval = 6;
    else s.interval = Math.round(s.interval * s.ease);
    s.due = now + s.interval * 86400000;
  }
  return { ...card, srs: s };
}
