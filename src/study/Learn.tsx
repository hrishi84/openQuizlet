import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { shuffle, distractors } from "../studyUtil";
import type { Deck } from "../types";
import { reportAnswer, reportSession } from "../studyCommon";
import SessionSummary from "../components/SessionSummary";
import type { SummaryData } from "../components/SessionSummary";
import OptionRow from "../components/OptionRow";
import Checkpoint from "../components/Checkpoint";
import SegmentedProgress from "../components/SegmentedProgress";
import type { CheckpointItem } from "../components/Checkpoint";

interface Props {
  deck: Deck;
}

interface Round {
  cardId: string;
  answer: string;
  options: string[];
  picked: string | null;
}

type Phase = { kind: "playing"; round: Round } | { kind: "done" };

interface Session {
  mastery: Record<string, number>;
  phase: Phase;
  correct: number;
  asked: number;
}

const TARGET = 2; // correct answers needed per card

function startRound(deck: Deck, mastery: Record<string, number>): Phase {
  const remaining = deck.cards.filter((c) => (mastery[c.id] ?? 0) < TARGET);
  if (remaining.length === 0) return { kind: "done" };
  remaining.sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0));
  const card = remaining[Math.floor(Math.random() * Math.min(3, remaining.length))];
  return {
    kind: "playing",
    round: {
      cardId: card.id,
      answer: card.definition,
      options: shuffle([card.definition, ...distractors(deck.cards, card.definition, Math.min(3, deck.cards.length - 1))]),
      picked: null,
    },
  };
}

function freshSession(deck: Deck): Session {
  return { mastery: {}, phase: startRound(deck, {}), correct: 0, asked: 0 };
}

/** Learn: adaptive multiple choice — missed cards repeat until mastered. */
export default function Learn({ deck }: Props) {
  const [session, setSession] = useState<Session>(() => freshSession(deck));
  const [xp, setXp] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [log, setLog] = useState<CheckpointItem[]>([]);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);
  // a card counts as "learned" once it has been answered correctly this session
  const learnedCount = deck.cards.filter((c) => (session.mastery[c.id] ?? 0) >= 1).length;
  // session progress advances after every answer (wrong answers pull a card back)
  const totalSteps = deck.cards.length * TARGET;
  const doneSteps = deck.cards.reduce((n, c) => n + Math.min(session.mastery[c.id] ?? 0, TARGET), 0);

  useEffect(() => {
    if (session.phase.kind === "done" && !summary) {
      const res = reportSession({});
      setSummary({
        title: "Learn session",
        xp: xp + res.xpGained,
        correct: session.correct,
        total: session.asked,
        unlocked: res.unlocked,
        leveledUpTo: res.leveledUp?.to ?? null,
        streakMilestone: res.streakMilestone,
        goalCompleted: res.goalCompleted,
        onAgain: () => {
          setSummary(null);
          setXp(0);
          setSession(freshSession(deck));
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase.kind]);

  useEffect(() => {
    if (session.phase.kind !== "playing" || summary) return;
    const opts = session.phase.round.options;
    const picked = session.phase.round.picked;
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= opts.length && picked == null) {
        choose(opts[n - 1]);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (summary) return <SessionSummary data={summary} />;

  if (session.phase.kind === "done") return null;

  const { round } = session.phase;
  const card = byId.get(round.cardId)!;

  const choose = (opt: string) => {
    if (round.picked) return;
    const good = opt === round.answer;
    setSession((s) => {
      if (s.phase.kind !== "playing" || s.phase.round.picked != null) return s;
      return {
        ...s,
        asked: s.asked + 1,
        correct: s.correct + (good ? 1 : 0),
        mastery: good ? { ...s.mastery, [round.cardId]: (s.mastery[round.cardId] ?? 0) + 1 } : s.mastery,
        phase: { kind: "playing", round: { ...s.phase.round, picked: opt } },
      };
    });
    reportAnswer(deck.id, round.cardId, good);
    setXp((x) => x + (good ? 10 : 2));
    setLog((l) => [...l, { term: card.term, definition: card.definition, ok: good }]);
  };

  const advance = () => {
    setSession((s) => {
      if (s.phase.kind !== "playing") return s;
      const good = s.phase.round.picked === s.phase.round.answer;
      let mastery = s.mastery;
      if (!good) mastery = { ...mastery, [round.cardId]: 0 }; // missed → must hit TARGET again
      return { ...s, mastery, phase: startRound(deck, mastery) };
    });
    // milestone every 7 answers
    if (log.length % 7 === 0 && session.phase.kind === "playing") setCheckpointOpen(true);
  };

  if (checkpointOpen) {
    return (
      <Checkpoint
        items={log.slice(-7)}
        position={`round ${Math.ceil(log.length / 7)}`}
        onContinue={() => setCheckpointOpen(false)}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <SegmentedProgress value={doneSteps} max={totalSteps} />
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Choose the definition
        </Typography>
        <Typography variant="h5" sx={{ mt: 1, mb: 3 }}>
          {card.term}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {round.options.map((opt, i) => {
            const state =
              round.picked == null ? "idle" : opt === round.answer ? "right" : opt === round.picked ? "wrong" : "dim";
            return (
              <OptionRow
                key={opt}
                label={opt}
                index={i}
                state={state}
                disabled={round.picked != null && state === "dim"}
                onClick={() => choose(opt)}
              />
            );
          })}
        </Box>
      </Paper>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          {learnedCount}/{deck.cards.length} learned · press 1-4 to answer
        </Typography>
        {round.picked != null && (
          <Button variant="contained" onClick={advance}>
            Continue
          </Button>
        )}
      </Box>
    </Box>
  );
}
