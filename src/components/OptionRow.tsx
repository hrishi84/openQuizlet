import { motion } from "motion/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type OptionState = "idle" | "selected" | "right" | "wrong" | "dim";

const COLORS = {
  light: {
    right: { bg: "rgba(52,199,89,0.12)", border: "rgba(52,199,89,0.55)" },
    wrong: { bg: "rgba(255,59,48,0.10)", border: "rgba(255,59,48,0.5)" },
  },
  dark: {
    right: { bg: "rgba(48,209,88,0.14)", border: "rgba(48,209,88,0.55)" },
    wrong: { bg: "rgba(255,69,58,0.13)", border: "rgba(255,69,58,0.5)" },
  },
};

interface Props {
  label: string;
  index?: number;
  state?: OptionState;
  dark?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/** Full-width tappable answer row — Apple list style with spring press feedback. */
export default function OptionRow({ label, index, state = "idle", dark, disabled, onClick }: Props) {
  const c = COLORS[dark ? "dark" : "light"];
  const isColored = state === "right" || state === "wrong";
  const borderColor =
    state === "right" ? c.right.border : state === "wrong" ? c.wrong.border : state === "selected" ? "#0071e3" : undefined;

  return (
    <motion.div whileTap={disabled ? undefined : { scale: 0.985 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
      <Box
        onClick={disabled ? undefined : onClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 2.5,
          py: 2,
          borderRadius: "16px",
          cursor: disabled ? "default" : "pointer",
          bgcolor: state === "right" ? c.right.bg : state === "wrong" ? c.wrong.bg : (t) => t.palette.background.paper,
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? `inset 0 0 0 1px ${borderColor ?? "rgba(255,255,255,0.09)"}`
              : `inset 0 0 0 1px ${borderColor ?? "rgba(0,0,0,0.08)"}, 0 1px 3px rgba(0,0,0,0.04)`,
          transition: "background-color .25s ease",
          "&:hover": disabled ? undefined : { bgcolor: isColored ? undefined : "action.hover" },
        }}
      >
        {index != null && (
          <Box
            sx={{
              width: 24,
              height: 24,
              minWidth: 24,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
              color: state === "selected" ? "#fff" : "text.secondary",
              bgcolor: state === "selected" ? "#0071e3" : "action.hover",
              transition: "all .2s ease",
            }}
          >
            {index + 1}
          </Box>
        )}
        <Typography
          sx={{
            flex: 1,
            color: state === "dim" ? "text.disabled" : "text.primary",
            lineHeight: 1.4,
          }}
        >
          {label}
        </Typography>
        {state === "right" && <Typography color="success.main">✓</Typography>}
        {state === "wrong" && <Typography color="error.main">✕</Typography>}
      </Box>
    </motion.div>
  );
}
