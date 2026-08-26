import type { Card, Deck, Folder } from "./types";

const KEY = "openquizlet.decks.v1";
const FOLDER_KEY = "openquizlet.folders.v1";
const STREAK_KEY = "openquizlet.streak.v1";

/* ---------- decks ---------- */

export function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const decks = JSON.parse(raw) as Deck[];
    return Array.isArray(decks) ? decks : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks: Deck[]) {
  localStorage.setItem(KEY, JSON.stringify(decks));
}

export function upsertDeck(deck: Deck) {
  const decks = loadDecks();
  const i = decks.findIndex((d) => d.id === deck.id);
  deck.updatedAt = Date.now();
  if (i >= 0) decks[i] = deck;
  else decks.push(deck);
  saveDecks(decks);
}

export function deleteDeck(id: string) {
  saveDecks(loadDecks().filter((d) => d.id !== id));
  // also remove from any folder
  for (const f of loadFolders()) {
    if (f.deckIds.includes(id)) saveFolders(loadFolders().map((x) => (x.id === f.id ? { ...f, deckIds: f.deckIds.filter((i) => i !== id) } : x)));
  }
}

export function getDeck(id: string): Deck | undefined {
  return loadDecks().find((d) => d.id === id);
}

/** Update a single card inside a deck (by card id). */
export function updateCard(deckId: string, card: Card) {
  const deck = getDeck(deckId);
  if (!deck) return;
  const i = deck.cards.findIndex((c) => c.id === card.id);
  if (i >= 0) deck.cards[i] = card;
  upsertDeck(deck);
}

/** Record a correct/incorrect answer for progress tracking. */
export function markAnswer(deckId: string, cardId: string, correct: boolean) {
  const deck = getDeck(deckId);
  if (!deck) return;
  const i = deck.cards.findIndex((c) => c.id === cardId);
  if (i < 0) return;
  const stats = { correct: deck.cards[i].stats?.correct ?? 0, wrong: deck.cards[i].stats?.wrong ?? 0 };
  if (correct) stats.correct += 1;
  else stats.wrong += 1;
  deck.cards[i] = { ...deck.cards[i], stats };
  upsertDeck(deck);
}

/* ---------- folders ---------- */

export function loadFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    if (!raw) return [];
    const folders = JSON.parse(raw) as Folder[];
    return Array.isArray(folders) ? folders : [];
  } catch {
    return [];
  }
}

export function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
}

export function upsertFolder(folder: Folder) {
  const folders = loadFolders();
  const i = folders.findIndex((f) => f.id === folder.id);
  if (i >= 0) folders[i] = folder;
  else folders.push(folder);
  saveFolders(folders);
}

export function deleteFolder(id: string) {
  saveFolders(loadFolders().filter((f) => f.id !== id));
}

/** Add a deck to a folder (a deck lives in at most one folder). */
export function addDeckToFolder(folderId: string, deckId: string): string | null {
  const folders = loadFolders();
  // remove from other folders
  for (const f of folders) f.deckIds = f.deckIds.filter((id) => id !== deckId);
  const f = folders.find((x) => x.id === folderId);
  if (!f) return "Folder not found";
  if (!f.deckIds.includes(deckId)) f.deckIds.push(deckId);
  saveFolders(folders);
  return null;
}

export function removeDeckFromFolder(folderId: string, deckId: string) {
  const folders = loadFolders();
  const f = folders.find((x) => x.id === folderId);
  if (!f) return;
  f.deckIds = f.deckIds.filter((id) => id !== deckId);
  saveFolders(folders);
}

export function folderOfDeck(deckId: string): Folder | undefined {
  return loadFolders().find((f) => f.deckIds.includes(deckId));
}

/* ---------- streak ---------- */

export interface Streak {
  count: number;
  best: number;
  /** last day with activity, YYYY-MM-DD */
  lastDay: string | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

export function loadStreak(): Streak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as Streak) : { count: 0, best: 0, lastDay: null };
  } catch {
    return { count: 0, best: 0, lastDay: null };
  }
}

/** Call after any study activity; advances the daily streak once per day. */
export function recordActivity(): Streak {
  const s = loadStreak();
  const t = today();
  if (s.lastDay === t) return s;
  s.count = s.lastDay === yesterday() ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.lastDay = t;
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  return s;
}
