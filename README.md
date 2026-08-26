# openQuizlet

A free, minimal, habit-forming Quizlet alternative. 100% of features are free, and your data never leaves your device (localStorage).

## Study modes

- **Flashcards** — FSRS-scheduled flip cards in groups of 7 (bite-sized memorization). Keyboard: `Space` to flip, `1–4` to grade (Again / Hard / Good / Easy) with next-interval previews. Leech detection flags cards that keep slipping.
- **Learn** — adaptive multiple choice that repeats missed terms until mastered. `1–4` to answer.
- **Quiz** — one-shot graded MCQ over the whole deck.
- **Test** — practice mode (untimed, instant feedback) or test mode (30s/question timer, no feedback until submit), with mixed multiple-choice + true/false questions and a "review what you missed" section.
- **Match** — timed term/definition pairing game.

## The addictive layer (research-backed)

Modeled on the Duolingo method + behavioral psychology research:

- **XP & levels** — every answer earns XP; levels have titles (Novice → Legend) with a progress bar in the app bar.
- **Daily goal** — configurable XP goal with a satisfying goal ring on home; completion bonus + celebration.
- **Streaks** — daily flame with loss aversion, week-dot calendar popover, milestone celebrations at 3/7/14/30/100 days.
- **Achievements** — 15 badges (accuracy, streaks, perfect sessions, speed matching, early bird/night owl…).
- **Immediate feedback** — synthesized sounds for correct/wrong/level-up/completion, confetti on great results.
- **Session summaries** — count-up XP animation, accuracy ring, unlocked achievements.

## The learning science

- **FSRS-lite scheduler** (`src/srs.ts`) — implements the FSRS-4.5 three-component memory model (Difficulty, Stability, Retrievability) with published default weights and a 90% target retention. Benchmarks show FSRS reaches the same retention as SM-2 with ~20–30% fewer reviews.
- Same-day relearning for lapses (10-minute requeue).
- Per-set/folder/library mastery tracking (a card is "mastered" after 2 correct answers).

## Your data

- Create decks in-app or import CSV/TSV (`term,definition` — Quizlet-export compatible)
- JSON backup includes folders, FSRS memory state, and progress
- Folders group sets with aggregate mastery progress
- Export any deck as CSV or JSON

## Run

```sh
npm install
npm run dev        # website → http://localhost:5173
npm run build      # static site → dist/
npx tauri build    # Mac app → src-tauri/target/release/bundle/
```

## Stack

React + TypeScript + Vite + MUI (light/dark minimal themes), canvas-confetti, WebAudio synth SFX, Tauri v2. No backend, no accounts, no ads.
