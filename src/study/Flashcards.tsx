import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import { formatInterval, review } from "../srs";
import type { Grade } from "../srs";
import type { Card as Flashcard, Deck } from "../types";
import { isLeech } from "../types";
import * as store from "../storage";
import { award, gradeCard } from "../gamification";
import { reportSession } from "../studyCommon";
import { sounds } from "../sound";
import Checkpoint from "../components/Checkpoint";
import type { CheckpointItem } from "../components/Checkpoint";
import SessionSummary from "../components/SessionSummary";
import type { SummaryData } from "../components/SessionSummary";

/** Memorization happens in digestible chunks of this size. */
export const GROUP_SIZE = 7;

interface Props {
  deck: Deck;
}

type Rating = 1 | 2 | 3 | 4; // again / hard / good / easy

const GRADES: {
  r: Rating;
  label: string;
  key: string;
  bg: string;
  fg: string;
}[] = [
  { r: 1, label: "Again", key: "1", bg: "rgba(255,59,48,0.12)", fg: "#ff3b30" },
  { r: 2, label: "Hard", key: "2", bg: "rgba(255,159,10,0.14)", fg: "#c77700" },
  { r: 3, label: "Good", key: "3", bg: "#0071e3", fg: "#ffffff" },
  { r: 4, label: "Easy", key: "4", bg: "rgba(52,199,89,0.16)", fg: "#1d9e46" },
];

interface HistoryEntry {
  cardId: string;
  snapshot: Flashcard;
  xp: number;
}

/**
 * Flashcards — FSRS-scheduled, groups of 7.
 * Space flips · 1–4 grade · Z undo. Grading auto-advances with spring physics.
 */
export default function Flashcards({ deck }: Props) {
  const [order] = useState<string[]>(() =>
    [...deck.cards].sort((a, b) => (a.mem?.due ?? a.srs.due) - (b.mem?.due ?? b.srs.due)).map((c) => c.id),
  );
  const groups = useMemo(() => {
    const gs: string[][] = [];
    for (let i = 0; i < order.length; i += GROUP_SIZE) gs.push(order.slice(i, i + GROUP_SIZE));
    return gs;
  }, [order]);

  const [groupIdx, setGroupIdx] = useState(0);
  const [queue, setQueue] = useState<string[]>(() => [...groups[0]]);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [groupResults, setGroupResults] = useState<CheckpointItem[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);
  const card = queue.length > 0 ? byId.get(queue[0]) : undefined;
  const groupDone = !card;
  const lastGroup = groupIdx === groups.length - 1;
  const seenInGroup = GROUP_SIZE - queue.length;

  useEffect(() => setFlipped(false), [queue[0]]);

  /* keyboard shortcuts */
  useEffect(() => {
    if (summary || groupDone) return;
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        flip();
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key) as Rating);
      } else if ((e.key === "z" || e.key === "Z") && historyRef.current.length > 0) {
        undo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, queue[0], summary, groupDone]);

  if (summary) return <SessionSummary data={summary} />;

  function flip() {
    setFlipped((f) => !f);
    sounds.flip();
  }

  function rate(r: Rating) {
    if (!card) return;
    const correct = r >= 3;
    const snapshot = structuredClone(card);
    gradeCard(deck, card.id, correct, r as Grade);
    store.recordActivity();
    award({ xp: correct ? 10 : 2, answers: 1, correct: correct ? 1 : 0 });
    historyRef.current = [...historyRef.current.slice(-20), { cardId: card.id, snapshot, xp: correct ? 10 : 2 }];
    setCanUndo(true);
    setSessionXp((x) => x + (correct ? 10 : 2));
    if (correct) setSessionCorrect((n) => n + 1);
    else setSessionWrong((n) => n + 1);

    setGroupResults((g) => [...g, { term: card.term, definition: card.definition, ok: correct }]);
    // navigation: Again stays in the group (moves to the back); everything else advances
    if (r === 1) {
      setFlipped(false);
      setTimeout(() => setQueue((q) => (q.length ? [...q.slice(1), q[0]] : q)), 180);
    } else {
      setQueue((q) => q.slice(1));
    }
  }

  function undo() {
    const last = historyRef.current[historyRef.current.length - 1];
    if (!last) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    store.updateCard(deck.id, last.snapshot); // restore exact pre-grade memory state
    award({ xp: -last.xp, answers: -1 });
    setSessionXp((x) => x - last.xp);
    setFlipped(false);
    setQueue((q) => [last.cardId, ...q.filter((id) => id !== last.cardId)]);
    sounds.tap();
  }

  function finishSession() {
    const res = reportSession({});
    setSummary({
      title: "Flashcards",
      xp: sessionXp + res.xpGained,
      correct: sessionCorrect,
      total: sessionCorrect + sessionWrong,
      details: [`Reached group ${groupIdx + 1} of ${groups.length}`],
      unlocked: res.unlocked,
      leveledUpTo: res.leveledUp?.to ?? null,
      streakMilestone: res.streakMilestone,
      goalCompleted: res.goalCompleted,
      onAgain: () => {
        setSummary(null);
        setGroupIdx(0);
        setQueue([...groups[0]]);
        setSessionXp(0);
        setSessionCorrect(0);
        setSessionWrong(0);
        historyRef.current = [];
        setCanUndo(false);
      },
    });
  }

  if (groupDone && !summary) {
    return (
      <Box>
        <Checkpoint
          continueLabel={lastGroup ? "Run it back" : "Next group"}
          items={groupResults}
          position={`group ${groupIdx + 1} of ${groups.length}`}
          onContinue={() => {
            const gi = lastGroup ? 0 : groupIdx + 1;
            setGroupIdx(gi);
            setQueue([...groups[gi]]);
            setGroupResults([]);
          }}
        />
        <Button fullWidth color="inherit" sx={{ mt: 1.5 }} onClick={finishSession}>
          End session · +{sessionXp} XP banked
        </Button>
      </Box>
    );
  }

  const front = reverse ? card!.definition : card!.term;
  const back = reverse ? card!.term : card!.definition;

  const previews = ([1, 2, 3, 4] as Rating[]).map((r) => formatInterval(review(card?.mem, r as Grade).intervalDays));

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", userSelect: "none" }}>
      {/* header: group + position + undo */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<UndoOutlinedIcon />}
          disabled={!canUndo}
          onClick={undo}
          sx={{ opacity: canUndo ? 1 : 0.35 }}
        >
          Undo
        </Button>

        {/* segmented progress for the group */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {Array.from({ length: Math.min(GROUP_SIZE, groups[groupIdx]?.length ?? GROUP_SIZE) }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 8, height: 8, borderRadius: "50%",
                bgcolor: i < seenInGroup ? "#0071e3" : "divider" as string,
                transition: "background-color .3s ease",
              }}
            />
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Group {groupIdx + 1}/{groups.length}
        </Typography>
      </Box>

      {/* the card */}
      <Box sx={{ perspective: 1600 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${queue[0]}-${seenInGroup}`}
            initial={{ opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <Box sx={{ perspective: 1600 }}>
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                style={{ transformStyle: "preserve-3d", position: "relative", width: "100%" }}
              >
                {/* front */}
                <CardFace text={front} hint={isLeech(card!) ? "Leech — this one keeps slipping" : undefined} />
                {/* back */}
                <Box style={{ transform: "rotateY(180deg)" }} sx={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}>
                  <CardFace text={back} accent />
                </Box>
              </motion.div>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* controls */}
      <Box sx={{ mt: 4 }}>
        {!flipped ? (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <Button fullWidth size="large" variant="contained" onClick={flip}>
              Show answer
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
              or press Space
            </Typography>
          </motion.div>
        ) : (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
              {GRADES.map((g) => (
                <Button
                  key={g.r}
                  onClick={() => rate(g.r)}
                  sx={{
                    py: 1.5,
                    borderRadius: 4,
                    flexDirection: "column",
                    gap: 0.2,
                    bgcolor: g.bg,
                    color: g.fg,
                    "&:hover": { bgcolor: g.bg, filter: "brightness(0.96)" },
                    ...(g.r === 3 ? { boxShadow: "0 6px 18px rgba(0,113,227,0.35)" } : {}),
                  }}
                >
                  <Typography fontWeight={600} fontSize={15}>{g.label}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.65 }}>{previews[g.r - 1]}</Typography>
                </Button>
              ))}
            </Box>
          </motion.div>
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button size="small" color="inherit" sx={{ opacity: 0.6 }} onClick={() => setReverse((r) => !r)}>
          {reverse ? "Definition first" : "Term first"}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
          {sessionXp > 0 ? `+${sessionXp} XP this session` : " "}
        </Typography>
      </Box>
    </Box>
  );
}

function CardFace({ text, accent, hint }: { text: string; accent?: boolean; hint?: string }) {
  return (
    <Box
      sx={{
        minHeight: 340,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 4,
        py: 6,
        borderRadius: "24px",
        background: (t) =>
          accent
            ? t.palette.mode === "dark"
              ? "linear-gradient(180deg,#16233d,#1c1c1e)"
              : "linear-gradient(180deg,#eef5ff,#ffffff)"
            : t.palette.background.paper,
        boxShadow: (t) =>
          t.palette.mode === "dark"
            ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
            : "0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04)",
        backfaceVisibility: "hidden",
      }}
    >
      <Typography variant="h4" sx={{ textAlign: "center", letterSpacing: "-0.02em", whiteSpace: "pre-wrap" }}>
        {text}
      </Typography>
      {hint && (
        <Typography variant="caption" color="error" sx={{ mt: 2, opacity: 0.7 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
