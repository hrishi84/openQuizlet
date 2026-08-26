import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { fireConfetti, useCountUp } from "../celebrate";
import { levelTitle } from "../gamification";
import { sounds } from "../sound";

export interface SummaryData {
  title: string;
  xp: number;
  correct: number;
  total: number;
  /** extra lines, e.g. time taken */
  details?: string[];
  unlocked?: { emoji: string; name: string; desc: string }[];
  leveledUpTo?: number | null;
  streakMilestone?: null | number;
  goalCompleted?: boolean;
  onAgain: () => void;
}

/** End-of-session reward screen: confetti, count-up XP, achievements. */
export default function SessionSummary({ data }: { data: SummaryData }) {
  const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
  const shownXp = useCountUp(data.xp);
  const [showUnlocked, setShowUnlocked] = useState(false);

  const great = pct >= 80;

  useEffect(() => {
    if (great) fireConfetti(pct === 100 ? "big" : "small");
    sounds.complete();
    const t = setTimeout(() => {
      setShowUnlocked(true);
      if (data.unlocked?.length) sounds.achievement();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data.leveledUpTo) {
      sounds.levelUp();
      fireConfetti("big");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 4 }}>
      <Paper
        elevation={0}
        sx={{ p: 4, textAlign: "center", borderRadius: "24px" }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{data.title}</Typography>
        <Typography variant="h2" color={great ? "success.main" : pct >= 50 ? "warning.main" : "error"} fontWeight={800}>
          {pct}%
        </Typography>
        <Typography color="text.secondary">
          {data.correct}/{data.total} correct
        </Typography>

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h3" color="secondary.main" fontWeight={800}>
            +{shownXp} <Typography component="span" variant="h5">XP</Typography>
          </Typography>
        </Box>

        {(data.leveledUpTo || data.streakMilestone || data.goalCompleted) && (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap", mt: 2 }}>
            {data.leveledUpTo && (
              <Chip label={`Level up! You're now level ${data.leveledUpTo} · ${levelTitle(data.leveledUpTo)}`} color="primary" />
            )}
            {data.streakMilestone && <Chip label={`🔥 ${data.streakMilestone}-day streak milestone!`} sx={{ bgcolor: "#fff3e0", color: "#ea580c" }} />}
            {data.goalCompleted && <Chip color="success" label="Daily goal smashed! 🎉" />}
          </Box>
        )}

        {data.details && data.details.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {data.details.join(" · ")}
          </Typography>
        )}

        <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={data.onAgain}>
          Keep going
        </Button>
      </Paper>

      {showUnlocked && data.unlocked && data.unlocked.length > 0 && (
        <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
          {data.unlocked.map((a) => (
            <Paper key={a.name} elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 2, display: "flex", gap: 2, alignItems: "center", animation: "slideIn .4s ease" }}>
              <Typography fontSize={32}>{a.emoji}</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Achievement unlocked — {a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </Box>
  );
}
