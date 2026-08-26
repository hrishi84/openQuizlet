import { createTheme, alpha } from "@mui/material/styles";

/**
 * Design language: Apple-inspired.
 * - System type (SF Pro on macOS/iOS), generous sizes, tight tracking
 * - One accent (Apple blue), everything else neutral
 * - Continuous-curve surfaces: 18px cards, pill controls
 * - Depth via soft diffuse shadows + translucency, not hairline boxes
 */

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", Roboto, sans-serif';

const ACCENT = "#0071e3"; // apple.com blue
const ACCENT_DARK = "#2997ff";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: ACCENT, contrastText: "#fff" },
    secondary: { main: ACCENT },
    success: { main: "#34c759" },
    warning: { main: "#ff9f0a" },
    error: { main: "#ff3b30" },
    background: { default: "#f5f5f7", paper: "#ffffff" },
    text: { primary: "#1d1d1f", secondary: "#6e6e73", disabled: "#aeaeb2" },
    divider: "rgba(0,0,0,0.06)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.022em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.019em" },
    h5: { fontWeight: 600, letterSpacing: "-0.017em" },
    h6: { fontWeight: 600, letterSpacing: "-0.014em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 590 as unknown as number, letterSpacing: "-0.01em" },
  },
  shadows: [
    "none",
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 2px 8px rgba(0,0,0,0.05)",
    "0 4px 14px rgba(0,0,0,0.06)",
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 12px 32px rgba(0,0,0,0.10)",
    ...Array(19).fill("0 16px 40px rgba(0,0,0,0.12)"),
  ] as never,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased", textRendering: "optimizeLegibility" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 980, paddingTop: 8, paddingBottom: 8, paddingLeft: 18, paddingRight: 18 },
        containedPrimary: {
          backgroundColor: ACCENT,
          "&:hover": { backgroundColor: "#0077ed" },
        },
        outlined: { borderColor: "rgba(0,0,0,0.12)" },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiCard: {
      defaultProps: { variant: undefined, elevation: 0 },
      styleOverrides: {
        root: {
          border: "none",
          borderRadius: 18,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04), 0 0 1px rgba(0,0,0,0.10)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "rgba(0,0,0,0.07)", borderRadius: 18 },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 980, fontWeight: 590 as unknown as number } } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.07)" },
        bar: { borderRadius: 3 },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.15)" } } },
    MuiTooltip: { defaultProps: { arrow: false }, styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } } },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ACCENT_DARK, contrastText: "#fff" },
    secondary: { main: ACCENT_DARK },
    success: { main: "#30d158" },
    warning: { main: "#ffd60a" },
    error: { main: "#ff453a" },
    background: { default: "#000000", paper: "#1c1c1e" },
    text: { primary: "#f5f5f7", secondary: "#98989d", disabled: "#48484a" },
    divider: "rgba(255,255,255,0.09)",
  },
  shape: { borderRadius: 14 },
  typography: lightTheme.typography,
  shadows: lightTheme.shadows,
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 980, paddingTop: 8, paddingBottom: 8, paddingLeft: 18, paddingRight: 18 },
        outlined: { borderColor: "rgba(255,255,255,0.16)" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "none", borderRadius: 18, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "rgba(255,255,255,0.09)", borderRadius: 18 },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 980, fontWeight: 590 as unknown as number } } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)" },
        bar: { borderRadius: 3 },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 14 } } },
  },
});

export function frosted(mode: "light" | "dark") {
  return {
    backdropFilter: "saturate(180%) blur(20px)",
    backgroundColor:
      mode === "light" ? alpha("#ffffff", 0.72) : alpha("#1c1c1e", 0.72),
  };
}
