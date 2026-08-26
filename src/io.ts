import { newCard, newDeck, uid } from "./types";
import type { Card, Deck, Folder } from "./types";
import { loadFolders } from "./storage";

/** Parse CSV supporting quoted fields. Returns rows of cells (first row = header if detectable). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_WORDS = ["term", "definition", "front", "back", "question", "answer", "word", "meaning"];

export function csvToDeck(name: string, text: string): Deck {
  const rows = parseCsv(text);
  const deck = newDeck(name);
  for (const [i, r] of rows.entries()) {
    if (r.length < 2) continue;
    const a = r[0].trim();
    const b = r[1].trim();
    if (i === 0 && HEADER_WORDS.includes(a.toLowerCase()) && HEADER_WORDS.includes(b.toLowerCase())) continue;
    deck.cards.push(newCard(a, b));
  }
  return deck;
}

export function deckToCsv(deck: Deck): string {
  const esc = (s: string) => (/["\n,\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return ["term,definition", ...deck.cards.map((c) => `${esc(c.term)},${esc(c.definition)}`)].join("\n");
}

export interface ExportBundle {
  app: "openquizlet";
  version: 2;
  exportedAt: number;
  decks: Deck[];
  folders?: { id: string; name: string; createdAt: number; deckIds: string[] }[];
}

export function exportJson(decks: Deck[]): string {
  return JSON.stringify(
    {
      app: "openquizlet",
      version: 2 as const,
      exportedAt: Date.now(),
      decks,
      folders: loadFolders(),
    },
    null,
    2,
  );
}

export function importJson(text: string): { decks: Deck[]; folders: Folder[] } {
  const data = JSON.parse(text);
  const rawDecks: unknown[] = Array.isArray(data) ? data : data.decks ?? [];
  const rawFolders: Folder[] = Array.isArray(data?.folders) ? data.folders : [];
  const decks = (rawDecks as Deck[]).map((d) => ({
    id: d.id || uid(),
    name: String(d.name ?? "Imported deck"),
    description: String(d.description ?? ""),
    createdAt: d.createdAt ?? Date.now(),
    updatedAt: d.updatedAt ?? Date.now(),
    cards: (d.cards ?? []).map(
      (c: { id?: string; term?: string; definition?: string; srs?: Card["srs"]; stats?: Card["stats"]; mem?: Card["mem"] }) => ({
        id: c.id || uid(),
        term: String(c.term ?? ""),
        definition: String(c.definition ?? ""),
        srs: c.srs ?? { ease: 2.5, interval: 0, due: Date.now(), reps: 0, lapses: 0 },
        mem: c.mem,
        stats: c.stats,
      }),
    ),
  }));
  return { decks, folders: rawFolders };
}
