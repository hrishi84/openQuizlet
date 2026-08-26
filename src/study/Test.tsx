import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { shuffle, distractors } from "../studyUtil";
import { uid } from "../types";
import type { Deck } from "../types";
import * as store from "../storage";
import { award } from "../gamification";
import { SESSION_BONUS, PERFECT_BONUS } from "../studyCommon";
import OptionRow from "../components/OptionRow";
import SegmentedProgress from "../components/SegmentedProgress";
import Checkpoint from "../components/Checkpoint";
import { fireConfetti, useCountUp } from "../celebrate";
import { sounds } from "../sound";

interface Props {
  deck: Deck;
}

type Kind = "mcq" | "tf";
type Mode = "practice" | "test";

interface Question {
  id: string;
  kind: Kind;
  cardId: string;
  /** prompt line */
  prompt: string;
  /** statement shown for true/false questions */
  statement?: string;
  options: string[];
  answer: string;
  picked: string | null;
}

function buildQuestions(deck: Deck, count: number): Question[] {
  const pool = shuffle(deck.cards).slice(0, count);
  return pool.map((c) => {
    const useTf = deck.cards.length >= 4 && Math.random() < 0.3;
    if (useTf) {
      // true/false: pair this term with a random definition (sometimes its own)
      const other = shuffle(deck.cards.filter((x) => x.id !== c.id))[0];
      const isTrue = !other || Math.random() < 0.5;
      return {
        id: uid(),
        kind: "tf",
        cardId: c.id,
        prompt: `“${c.term}” means:`,
        statement: isTrue ? c.definition : other.definition,
        options: ["True", "False"],
        answer: isTrue ? "True" : "False",
        picked: null,
      };
    }
    const opts = [c.definition, ...distractors(deck.cards, c.definition, Math.min(3, Math.max(1, deck.cards.length - 1)))];
    return {
      id: uid(),
      kind: "mcq",
      cardId: c.id,
      prompt: `“${c.term}” means:`,
      options: shuffle([...new Set(opts)]),
      answer: c.definition,
      picked: null,
    };
  });
}

const COUNT_OPTIONS = [10, 20] as const;

export default function Test({ deck }: Props) {
  const [phase, setPhase] = useState<"setup" | "running" | "results">("setup");
  const [checkpointAt, setCheckpointAt] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("test");
  const [count, setCount] = useState<number>(Math.min(10, deck.cards.length));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const startedRef = useRef(0);
  const elapsedRef = useRef(0);
  const resultRef = useRef<ReturnType<typeof award> | null>(null);
  const resultStats = useRef<{ score: number; total: number }>({ score: 0, total: 0 });

  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);

  /* timer for test mode */
  useEffect(() => {
    if (phase !== "running" || mode !== "test") return;
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, secondsLeft]);

  const start = () => {
    const qs = buildQuestions(deck, count);
    setQuestions(qs);
    setIndex(0);
    startedRef.current = Date.now();
    if (mode === "test") setSecondsLeft(qs.length * 30);
    setPhase("running");
  };

  const finish = () => {
    elapsedRef.current = Math.round((Date.now() - startedRef.current) / 1000);
    setQuestions((qs) => {
      const answered = qs.filter((q) => q.picked != null);
      const score = qs.filter((q) => q.picked === q.answer).length;
      const perfect = score === qs.length && answered.length === qs.length;
      for (const q of answered) store.markAnswer(deck.id, q.cardId, q.picked === q.answer);
      if (answered.length > 0) {
        store.recordActivity();
        resultRef.current = award({
          xp: score * 10 + (answered.length - score) * 2 + SESSION_BONUS + (perfect ? PERFECT_BONUS : 0),
          answers: answered.length,
          correct: score,
          sessionComplete: true,
          perfectSession: perfect,
        });
        resultStats.current = { score, total: qs.length };
      }
      return qs;
    });
    setPhase("results");
  };

  const pick = (opt: string) => {
    if (mode === "practice" && questions[index]?.picked) return;
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, picked: opt } : q)));
  };

  /* ---------- setup screen ---------- */
  if (phase === "setup") {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", mt: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Test your skills
        </Typography>
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 3, display: "grid", gap: 2.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">Format</Typography>
            <ToggleButtonGroup
              fullWidth
              exclusive
              value={mode}
              onChange={(_, v) => v && setMode(v)}
              size="small"
            >
              <ToggleButton value="practice">Practice</ToggleButton>
              <ToggleButton value="test">Test</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {mode === "practice"
                ? "Untimed. Instant feedback after each question."
                : "Timed (30s/question). No feedback until you submit."}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Questions</Typography>
            <ToggleButtonGroup
              fullWidth
              exclusive
              value={count}
              onChange={(_, v) => v && setCount(v)}
              size="small"
            >
              {COUNT_OPTIONS.filter((n) => n < deck.cards.length).map((n) => (
                <ToggleButton key={n} value={n}>{n}</ToggleButton>
              ))}
              <ToggleButton value={deck.cards.length}>All ({deck.cards.length})</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Button variant="contained" onClick={start}>
            Start {mode === "test" ? `(${count * 30}s)` : ""}
          </Button>
        </Paper>
      </Box>
    );
  }

  /* ---------- results ---------- */
  if (phase === "results") {
    const answered = questions.filter((q) => q.picked != null);
    const score = questions.filter((q) => q.picked === q.answer).length;
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const missed = questions.filter((q) => q.picked !== q.answer);
    const res = resultRef.current;
    return (
      <TestResults
        pct={pct}
        score={score}
        total={questions.length}
        elapsed={elapsedRef.current}
        mode={mode}
        answeredCount={answered.length}
        xp={res ? res.xpGained : 0}
        unlocked={res?.unlocked.map((a) => ({ emoji: a.emoji, name: a.name, desc: a.desc })) ?? []}
        leveledUpTo={res?.leveledUp?.to ?? null}
        streakMilestone={res?.streakMilestone ?? null}
        goalCompleted={res?.goalCompleted ?? false}
        missed={missed.map((q) => ({
          id: q.id,
          term: byId.get(q.cardId)?.term ?? "",
          correctLine: q.kind === "tf" ? q.statement ?? "" : q.answer,
          pickedLine: q.picked ? (q.kind === "tf" ? `“${q.statement}” → ${q.picked}` : q.picked) : "Unanswered",
        }))}
        onNew={() => setPhase("setup")}
        onRetry={() => {
          setQuestions(buildQuestions(deck, count));
          setIndex(0);
          startedRef.current = Date.now();
          setPhase("running");
        }}
      />
    );
  }

  /* ---------- running ---------- */
  const q = questions[index];
  if (!q) return null;
  const feedback = mode === "practice" && q.picked != null;

  const nextOrFinish = () => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      finish();
      return;
    }
    // milestone recaps in practice mode only — timed tests shouldn't pause
    if (mode === "practice" && nextIndex % 7 === 0 && nextIndex < questions.length - 1) {
      setCheckpointAt(nextIndex);
    } else {
      setIndex(nextIndex);
    }
  };

  if (checkpointAt != null) {
    return (
      <Checkpoint
        items={questions.slice(checkpointAt - 7, checkpointAt).map((qq) => ({
          term: byId.get(qq.cardId)?.term ?? "",
          definition: qq.answer,
          ok: qq.picked === qq.answer,
        }))}
        position={`round ${Math.ceil(checkpointAt / 7)} · ${checkpointAt} of ${questions.length}`}
        onContinue={() => {
          setIndex(checkpointAt);
          setCheckpointAt(null);
        }}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <SegmentedProgress value={index + (q.picked ? 1 : 0)} max={questions.length} />
        </Box>
        {mode === "test" && (
          <Chip
            size="small"
            color={secondsLeft <= 30 ? "error" : "default"}
            label={`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
          />
        )}
        {mode === "practice" && <Chip size="small" label={`Question ${index + 1}`} />}
      </Box>

      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {q.kind === "tf" ? "True or false?" : "Multiple choice"}
        </Typography>
        <Typography variant="h6" sx={{ mt: 1 }}>{q.prompt}</Typography>
        {q.kind === "tf" && (
          <Typography variant="h5" sx={{ my: 2, fontStyle: q.statement ? undefined : "italic" }}>
            {q.statement}
          </Typography>
        )}
        <Box sx={{ display: "grid", gap: 1.5, mt: q.kind === "tf" ? 0 : 2 }}>
          {q.options.map((opt, i) => {
            let state: "idle" | "right" | "wrong" | "dim" | "selected" = "idle";
            if (q.picked != null) {
              if (opt === q.answer) state = "right";
              else if (opt === q.picked) state = "wrong";
              else state = feedback ? "dim" : "dim";
            }
            return (
              <OptionRow
                key={opt}
                label={opt}
                index={i}
                state={state}
                disabled={q.picked != null && mode === "test"}
                onClick={() => pick(opt)}
              />
            );
          })}
        </Box>
        {feedback && (
          <Typography sx={{ mt: 2 }} color={q.picked === q.answer ? "success.main" : "error.main"}>
            {q.picked === q.answer ? "Correct!" : `Incorrect — the answer is “${q.answer}”.`}
          </Typography>
        )}
      </Paper>

      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
        <Button
          color="inherit"
          onClick={finish}
          disabled={questions.every((x) => x.picked == null)}
        >
          Submit
        </Button>
        {(mode === "test" || feedback) && (
          <Button variant="contained" onClick={nextOrFinish} disabled={mode === "test" && q.picked == null}>
            {index + 1 >= questions.length ? "Submit" : "Next"}
          </Button>
        )}
      </Box>
      {mode === "test" && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", mt: 1 }}>
          Answers save automatically when time runs out
        </Typography>
      )}
    </Box>
  );
}

/* ---------- results component with celebration ---------- */

interface MissedItem {
  id: string;
  term: string;
  correctLine: string;
  pickedLine: string;
}

interface TestResultsProps {
  pct: number;
  score: number;
  total: number;
  elapsed: number;
  mode: Mode;
  answeredCount: number;
  xp: number;
  unlocked: { emoji: string; name: string; desc: string }[];
  leveledUpTo: number | null;
  streakMilestone: number | null;
  goalCompleted: boolean;
  missed: MissedItem[];
  onNew: () => void;
  onRetry: () => void;
}

function TestResults(p: TestResultsProps) {
  const shownXp = useCountUp(p.xp);
  useEffect(() => {
    if (p.pct >= 80) fireConfetti(p.pct === 100 ? "big" : "small");
    sounds.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h2" color={p.pct >= 80 ? "success.main" : p.pct >= 50 ? "warning.main" : "error"}>
          {p.pct}%
        </Typography>
        <Typography variant="h6">
          {p.score}/{p.total} correct
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {p.mode === "test" ? `Finished in ${p.elapsed}s` : "Practice session"}
        </Typography>
        <Typography variant="h4" color="secondary.main" fontWeight={800} sx={{ mt: 2 }}>
          +{shownXp} <Typography component="span" variant="h5">XP</Typography>
        </Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap", mt: 1.5 }}>
          {p.leveledUpTo && <Chip color="primary" label={`Level up! Level ${p.leveledUpTo}`} />}
          {p.streakMilestone && <Chip label={`🔥 ${p.streakMilestone}-day streak!`} sx={{ bgcolor: "#fff3e0", color: "#ea580c" }} />}
          {p.goalCompleted && <Chip color="success" label="Daily goal smashed! 🎉" />}
        </Box>
      </Box>

      {p.unlocked.length > 0 && (
        <Box sx={{ mb: 3, display: "grid", gap: 1 }}>
          {p.unlocked.map((a) => (
            <Paper key={a.name} elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 2, display: "flex", gap: 2, alignItems: "center" }}>
              <Typography fontSize={32}>{a.emoji}</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Achievement unlocked — {a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {p.missed.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>Review what you missed</Typography>
          {p.missed.map((m) => (
            <Paper key={m.id} elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 2, mb: 1.5 }}>
              <Typography fontWeight={600}>{m.term}</Typography>
              <Typography variant="body2" color="success.main">Correct: {m.correctLine}</Typography>
              <Typography variant="body2" color="error.main">You answered: {m.pickedLine}</Typography>
            </Paper>
          ))}
        </>
      )}

      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 3 }}>
        <Button variant="contained" onClick={p.onNew}>
          New {p.mode === "test" ? "test" : "practice"}
        </Button>
        {p.mode === "practice" && p.answeredCount > 0 && (
          <Button variant="outlined" onClick={p.onRetry}>
            Retry similar
          </Button>
        )}
      </Box>
    </Box>
  );
}
