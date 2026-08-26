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
import SegmentedProgress from "../components/SegmentedProgress";
import Checkpoint from "../components/Checkpoint";

interface Props {
  deck: Deck;
}

interface Q {
  cardId: string;
  options: string[];
  answer: string;
  picked: string | null;
}

function buildQuiz(deck: Deck): Q[] {
  return shuffle(deck.cards).map((c) => ({
    cardId: c.id,
    answer: c.definition,
    options: shuffle([c.definition, ...distractors(deck.cards, c.definition, 3)]),
    picked: null,
  }));
}

/** Quiz: one-shot multiple-choice test over the whole deck with a graded result. */
export default function Quiz({ deck }: Props) {
  const [questions, setQuestions] = useState<Q[]>(() => buildQuiz(deck));
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [checkpointAt, setCheckpointAt] = useState<number | null>(null); // question index where a checkpoint was opened
  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);

  if (questions.length === 0) {
    return <Typography color="text.secondary">This deck has no cards.</Typography>;
  }

  /* keyboard shortcuts */
  useEffect(() => {
    if (summary || checkpointAt != null || index >= questions.length) return;
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= questions[index].options.length && !questions[index].picked) {
        pick(questions[index].options[n - 1]);
      }
      if (e.key === "Enter" && questions[index].picked) {
        if (index + 1 === questions.length) finish();
        else if ((index + 1) % 7 === 0 && index + 1 < questions.length - 1) setCheckpointAt(index + 1);
        else setIndex((i) => i + 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, summary]);

  const finish = () => {
    const score = questions.filter((q) => q.picked === q.answer).length;
    const perfect = score === questions.length;
    const res = reportSession({ perfect });
    setSummary({
      title: "Quiz complete",
      xp: xp + res.xpGained,
      correct: score,
      total: questions.length,
      unlocked: res.unlocked,
      leveledUpTo: res.leveledUp?.to ?? null,
      streakMilestone: res.streakMilestone,
      goalCompleted: res.goalCompleted,
      onAgain: () => {
        setSummary(null);
        setQuestions(buildQuiz(deck));
        setIndex(0);
        setXp(0);
      },
    });
  };

  if (summary) return <SessionSummary data={summary} />;

  if (index >= questions.length) {
    return null; // finish() is triggered by the last "See results" action
  }

  const q = questions[index];
  const card = byId.get(q.cardId)!;

  function nextOrCheckpoint() {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      finish();
      return;
    }
    if (nextIndex % 7 === 0 && nextIndex < questions.length - 1) {
      setCheckpointAt(nextIndex); // pause at the milestone
    } else {
      setIndex(nextIndex);
    }
  }

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

  const pick = (opt: string) => {
    if (q.picked) return;
    const good = opt === q.answer;
    setQuestions((qs) => qs.map((x, i) => (i === index ? { ...x, picked: opt } : x)));
    reportAnswer(deck.id, q.cardId, good);
    setXp((x) => x + (good ? 10 : 2));
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <SegmentedProgress value={index + (q.picked ? 1 : 0)} max={questions.length} />
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Question {index + 1} of {questions.length}
        </Typography>
        <Typography variant="h5" sx={{ mt: 1, mb: 3 }}>
          {card.term}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {q.options.map((opt, i) => {
            const state = !q.picked ? "idle" : opt === q.answer ? "right" : opt === q.picked ? "wrong" : "dim";
            return (
              <OptionRow
                key={opt}
                label={opt}
                index={i}
                state={state}
                disabled={!!q.picked && state === "dim"}
                onClick={() => pick(opt)}
              />
            );
          })}
        </Box>
      </Paper>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        {q.picked && (
          <Button variant="contained" onClick={nextOrCheckpoint}>
            {index + 1 === questions.length ? "See results" : "Next"}
          </Button>
        )}
      </Box>
    </Box>
  );
}
