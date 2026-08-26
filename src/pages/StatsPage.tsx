import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Deck } from "../types";
import { deckProgress } from "../types";
import type { Streak } from "../storage";
import {
  ACHIEVEMENTS,
  lastNDays,
  levelInfo,
  levelTitle,
  loadAchievements,
  loadXp,
} from "../gamification";

export default function StatsPage({ decks, streak }: { decks: Deck[]; streak: Streak }) {
  const xp = loadXp();
  const li = levelInfo(xp.total);
  const days = lastNDays(14);
  const maxXp = Math.max(10, ...days.map((d) => d.activity.xp));
  const unlocked = new Set(loadAchievements());
  const acc = xp.counters.answers > 0 ? Math.round((xp.counters.correct / xp.counters.answers) * 100) : null;

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {/* Level + streak */}
      <Card>
        <CardContent sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 220px" }}>
            <Typography variant="overline" color="text.secondary">Level</Typography>
            <Typography variant="h3" fontWeight={800}>
              {li.level} <Typography component="span" variant="h6" color="text.secondary">{levelTitle(li.level)}</Typography>
            </Typography>
            <LinearProgress variant="determinate" value={li.pct} sx={{ mt: 1, height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary">
              {li.into}/{li.span} XP to level {li.level + 1} · {xp.total.toLocaleString()} XP total
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Streak</Typography>
            <Typography variant="h3" fontWeight={800} color="#ea580c">
              🔥 {streak.count}
            </Typography>
            <Typography variant="caption" color="text.secondary">best {streak.best} days</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Accuracy</Typography>
            <Typography variant="h3" fontWeight={800}>{acc != null ? `${acc}%` : "—"}</Typography>
            <Typography variant="caption" color="text.secondary">{xp.counters.correct}/{xp.counters.answers} answers</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 14-day activity chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Last 14 days</Typography>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75, height: 110 }}>
            {days.map((d) => (
              <Tooltip key={d.date} title={`${d.date}: ${d.activity.xp} XP · ${d.activity.answers} answers`}>
                <Box sx={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", flexDirection: "column", justifyContent: "flex-end" }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: `${Math.max(d.activity.xp > 0 ? 8 : 2, (d.activity.xp / maxXp) * 100)}%`,
                      bgcolor: d.activity.xp > 0 ? "#4255ff" : "action.hover",
                      borderRadius: 1,
                      transition: "height .3s ease",
                    }}
                  />
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, mt: 0.5 }}>
            {days.map((d) => (
              <Typography key={d.date} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center" }}>
                {d.label}
              </Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Set mastery */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Set mastery</Typography>
          {decks.length === 0 && <Typography color="text.secondary">No sets yet.</Typography>}
          {decks.map((d) => {
            const pct = Math.round(deckProgress(d) * 100);
            return (
              <Box key={d.id} sx={{ mb: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">{d.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{pct}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Achievements <Chip size="small" label={`${unlocked.size}/${ACHIEVEMENTS.length}`} />
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
            {ACHIEVEMENTS.map((a) => {
              const has = unlocked.has(a.id);
              return (
                <Paper
                  key={a.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: has ? "#f59e0b" : "divider",
                    bgcolor: has ? "transparent" : undefined,
                    opacity: has ? 1 : 0.45,
                  }}
                >
                  <Typography fontSize={30} sx={{ filter: has ? "none" : "grayscale(1)" }}>{a.emoji}</Typography>
                  <Typography variant="subtitle2">{a.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
