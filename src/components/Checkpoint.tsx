import { motion } from "motion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export interface CheckpointItem {
  term: string;
  definition: string;
  ok: boolean | null; // null = viewed only (flashcards)
}

/**
 * Milestone checkpoint — shown every ~7 questions.
 * Recaps the words just covered with their answers, like Quizlet's round summary.
 */
export default function Checkpoint({
  items,
  position,
  continueLabel = "Continue",
  onContinue,
}: {
  items: CheckpointItem[];
  /** human label e.g. "Round 1 · 7 of 21" */
  position?: string;
  continueLabel?: string;
  onContinue: () => void;
}) {
  const correct = items.filter((i) => i.ok === true).length;
  const graded = items.filter((i) => i.ok !== null).length;
  const pct = graded > 0 ? Math.round((correct / graded) * 100) : null;
  const headline =
    graded === 0 ? "Section cleared" : pct! >= 80 ? "You're on fire" : pct! >= 50 ? "Solid pace" : "Keep going";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <Box sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Milestone{position ? ` · ${position}` : ""}
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>
            {headline}
          </Typography>
          {pct !== null && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {correct}/{graded} correct so far
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "inset 0 0 0 1px rgba(255,255,255,0.09)"
                : "0 4px 18px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.term + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "baseline",
                  px: 2.5,
                  py: 1.75,
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? i % 2 === 0
                        ? "#1c1c1e"
                        : "#211f24"
                      : i % 2 === 0
                        ? "#ffffff"
                        : "#fafafa",
                }}
              >
                <Box sx={{ width: "38%", minWidth: 0 }}>
                  <Typography fontWeight={600} fontSize={14} noWrap title={item.term}>
                    {item.term}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap title={item.definition}>
                  {item.definition}
                </Typography>
                <Box sx={{ width: 20, textAlign: "center", flexShrink: 0 }}>
                  {item.ok === true && <Typography color="success.main" fontSize={13}>✓</Typography>}
                  {item.ok === false && <Typography color="error.main" fontSize={13}>✕</Typography>}
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>

        <Button variant="contained" size="large" fullWidth sx={{ mt: 3 }} onClick={onContinue}>
          {continueLabel}
        </Button>
      </Box>
    </motion.div>
  );
}
