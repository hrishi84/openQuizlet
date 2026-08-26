import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { shuffle } from "../studyUtil";
import type { Deck } from "../types";
import * as store from "../storage";
import { reportSession } from "../studyCommon";
import { fireConfetti } from "../celebrate";
import { sounds, bgm } from "../sound";
import { loadSettings } from "../gamification";

interface Props {
  deck: Deck;
}

interface Tile {
  key: string;
  cardId: string;
  side: "term" | "definition";
  text: string;
}

/** Match — timed pairing game with ambient soundtrack and tactile feedback. */
export default function Match({ deck }: Props) {
  const [round, setRound] = useState(0);
  if (deck.cards.length < 2) {
    return <Typography color="text.secondary">Match needs at least 2 cards.</Typography>;
  }
  return (
    <MatchGame
      key={round}
      deck={deck}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}

function MatchGame({ deck, onRestart }: { deck: Deck; onRestart: () => void }) {
  const pairCount = Math.min(6, deck.cards.length);
  const tiles = useMemo<Tile[]>(() => {
    const chosen = shuffle(deck.cards).slice(0, pairCount);
    return shuffle([
      ...chosen.map((c) => ({ key: c.id + "-t", cardId: c.id, side: "term" as const, text: c.term })),
      ...chosen.map((c) => ({ key: c.id + "-d", cardId: c.id, side: "definition" as const, text: c.definition })),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  const doneCount = removed.size / 2;
  const finished = doneCount === pairCount;

  /* soundtrack */
  useEffect(() => {
    if (loadSettings().bgm && !finished) bgm.start();
    return () => bgm.stop();
  }, [finished]);

  useEffect(() => {
    if (finished) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10), 100);
    return () => clearInterval(iv);
  }, [finished]);

  useEffect(() => {
    if (!finished) return;
    store.recordActivity();
    reportSession({ matchTimeMs: Math.round(elapsed * 1000) });
    setTimeout(() => fireConfetti(elapsed < 20 ? "big" : "small"), 350);
    setTimeout(() => sounds.achievement(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const clickTile = (tile: Tile) => {
    if (removed.has(tile.key) || wrongPair.length > 0 || finished) return;
    if (!selected) {
      setSelected(tile);
      sounds.tap();
      return;
    }
    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }
    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      sounds.correct();
      setCombo((c) => c + 1);
      const keys = new Set([selected.key, tile.key]);
      setRemoved((prev) => new Set([...prev, ...keys]));
      setSelected(null);
    } else {
      sounds.wrong();
      setCombo(0);
      setWrongPair([selected.key, tile.key]);
      setSelected(null);
      setTimeout(() => setWrongPair([]), 500);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4">Match</Typography>
          <Typography variant="body2" color="text.secondary">
            Tap a term, then its definition
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
            {elapsed.toFixed(1)}
            <Typography component="span" color="text.secondary" fontSize={16}>s</Typography>
          </Typography>
          {combo >= 2 && !finished && (
            <Typography variant="caption" fontWeight={700} color="#ff9f0a">
              🔥 {combo} in a row
            </Typography>
          )}
        </Box>
      </Box>

      {finished ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <Typography variant="h2" fontWeight={700}>{elapsed.toFixed(1)}s</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {pairCount} pairs cleared{elapsed < 20 ? " — speed demon 🏎️" : ""}
            </Typography>
            <Button variant="contained" size="large" sx={{ mt: 3 }} onClick={() => { setCombo(0); onRestart(); }}>
              Play again
            </Button>
          </Box>
        </motion.div>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 1.5 }}>
            <AnimatePresence>
              {tiles.map((tile) => {
                if (removed.has(tile.key)) {
                  return (
                    <motion.div
                      key={tile.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ minHeight: 88 }}
                    />
                  );
                }
                const isSelected = selected?.key === tile.key;
                const isWrong = wrongPair.includes(tile.key);
                return (
                  <motion.div
                    key={tile.key}
                    layout
                    whileTap={{ scale: 0.97 }}
                    animate={
                      isWrong
                        ? { x: [0, -7, 7, -5, 5, 0], opacity: 1 }
                        : { x: 0, opacity: 1 }
                    }
                    transition={isWrong ? { duration: 0.4 } : { type: "spring", stiffness: 400, damping: 30 }}
                  >
                    <Box
                      onClick={() => clickTile(tile)}
                      sx={{
                        p: 2,
                        minHeight: 88,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        cursor: "pointer",
                        borderRadius: "18px",
                        background: isSelected
                          ? (t) => (t.palette.mode === "dark" ? "#16233d" : "#eef5ff")
                          : (t) => t.palette.background.paper,
                        boxShadow: (t) =>
                          t.palette.mode === "dark"
                            ? `inset 0 0 0 1px ${isSelected ? "#2997ff" : isWrong ? "#ff453a" : "rgba(255,255,255,0.09)"}`
                            : `inset 0 0 0 1px ${isSelected ? "#0071e3" : isWrong ? "#ff3b30" : "rgba(0,0,0,0.06)"}, 0 1px 4px rgba(0,0,0,0.04)`,
                        transition: "box-shadow .15s ease, background-color .15s ease",
                        "&:hover": { boxShadow: `inset 0 0 0 1px ${isSelected ? "#0071e3" : "rgba(0,0,0,0.14)"}` },
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.45 }}>{tile.text}</Typography>
                    </Box>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Box>
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button size="small" color="inherit" onClick={() => { setCombo(0); onRestart(); }}>
              Shuffle & restart
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
