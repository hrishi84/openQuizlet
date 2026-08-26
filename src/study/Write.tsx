import { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { looseMatch, shuffle } from "../studyUtil";
import type { Deck } from "../types";

interface Props {
  deck: Deck;
}

/** Write: type the definition from memory. Misses re-enter the queue. */
export default function Write({ deck }: Props) {
  const [order] = useState(() => shuffle(deck.cards.map((c) => c.id)));
  const [queue, setQueue] = useState(order);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<null | { correct: boolean }>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [overrideOk, setOverrideOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);

  if (queue.length === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h4">Done! 🎉</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {stats.correct} correct · {stats.wrong} needed retry
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => {
            setQueue(shuffle(deck.cards.map((c) => c.id)));
            setStats({ correct: 0, wrong: 0 });
            setChecked(null);
          }}
        >
          Study again
        </Button>
      </Box>
    );
  }

  const card = byId.get(queue[0])!;
  const progress = ((deck.cards.length - queue.length) / deck.cards.length) * 100;

  const submit = () => {
    if (checked) {
      // advance
      if (!checked.correct) setQueue((q) => [...q.slice(1), q[0]]);
      else setQueue((q) => q.slice(1));
      setChecked(null);
      setInput("");
      setOverrideOk(false);
      inputRef.current?.focus();
      return;
    }
    if (!input.trim()) return;
    const correct = looseMatch(input, card.definition);
    setChecked({ correct });
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3 }} />
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 4 }}>
        <Typography variant="overline" color="text.secondary">
          Write the definition
        </Typography>
        <Typography variant="h5" sx={{ mb: 3 }}>
          {card.term}
        </Typography>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          label="Your answer"
          value={input}
          disabled={!!checked}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          error={checked ? !checked.correct && !looseMatch(input, card.definition) && !overrideOk : false}
        />
        {checked && (
          <Box sx={{ mt: 2 }}>
            {checked.correct || overrideOk ? (
              <Typography color="success.main">Correct!</Typography>
            ) : (
              <>
                <Typography color="error.main" sx={{ mb: 1 }}>
                  Not quite. Correct answer:
                </Typography>
                <Typography>{card.definition}</Typography>
              </>
            )}
          </Box>
        )}
      </Paper>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        {!checked && (
          <Button color="inherit" onClick={() => { setChecked({ correct: false }); setStats((s) => ({ ...s, wrong: s.wrong + 1 })); }}>
            Don&apos;t know
          </Button>
        )}
        {checked && !checked.correct && !overrideOk && (
          <Button color="inherit" onClick={() => { setStats((s) => ({ ...s, correct: s.correct + 1, wrong: s.wrong - 1 })); setOverrideOk(true); }}>
            I was right
          </Button>
        )}
        <Button variant="contained" onClick={submit} disabled={!checked && !input.trim()}>
          {checked ? "Continue" : "Check"}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        {queue.length} left
      </Typography>
    </Box>
  );
}
