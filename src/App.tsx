import { useCallback, useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Switch from "@mui/material/Switch";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import MusicOffOutlinedIcon from "@mui/icons-material/MusicOffOutlined";
import { frosted } from "./theme";
import type { Deck } from "./types";
import * as store from "./storage";
import type { Streak } from "./storage";
import {
  lastNDays,
  levelInfo,
  levelTitle,
  loadSettings,
  loadXp,
  saveSettings,
  todayKey,
} from "./gamification";
import HomePage from "./pages/HomePage";
import FolderPage from "./pages/FolderPage";
import DeckPage from "./pages/DeckPage";
import StatsPage from "./pages/StatsPage";
import Flashcards from "./study/Flashcards";
import Learn from "./study/Learn";
import Write from "./study/Write";
import Quiz from "./study/Quiz";
import Test from "./study/Test";
import Match from "./study/Match";

export type StudyMode = "flashcards" | "learn" | "write" | "quiz" | "test" | "match";

/** Write mode is gated until AI-assisted grading is integrated. */
export const WRITE_ENABLED = false;

export type View =
  | { page: "home" }
  | { page: "folder"; folderId: string }
  | { page: "deck"; deckId: string }
  | { page: "stats" }
  | { page: "study"; deckId: string; mode: StudyMode };

const GOALS = [20, 50, 100, 200];

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(() => store.loadDecks());
  const [view, setView] = useState<View>({ page: "home" });
  const [streak, setStreak] = useState<Streak>(() => store.loadStreak());
  const [settings, setSettingsState] = useState(() => loadSettings());
  const [, bump] = useState(0);
  const [settingsMenu, setSettingsMenu] = useState<HTMLElement | null>(null);
  const [streakAnchor, setStreakAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (view.page === "home") setStreak(store.loadStreak());
    bump((n) => n + 1);
  }, [view]);

  const refresh = useCallback(() => {
    setDecks(store.loadDecks());
    setStreak(store.loadStreak());
    bump((n) => n + 1);
  }, []);

  const save = useCallback(
    (deck: Deck) => {
      store.upsertDeck(deck);
      refresh();
    },
    [refresh],
  );

  const updateSettings = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch };
    setSettingsState(next);
    saveSettings(next);
  };

  const deck =
    view.page !== "home" && view.page !== "folder" && view.page !== "stats"
      ? decks.find((d) => d.id === view.deckId)
      : undefined;

  let body: React.ReactNode;
  switch (view.page) {
    case "home":
      body = (
        <HomePage
          decks={decks}
          onSave={save}
          onOpen={(id) => setView({ page: "deck", deckId: id })}
          onOpenFolder={(id) => setView({ page: "folder", folderId: id })}
          onChange={refresh}
          streak={streak}
        />
      );
      break;
    case "folder":
      body = (
        <FolderPage
          key={decks.map((d) => d.id + d.cards.length).join(",")}
          decks={decks}
          folderId={view.folderId}
          onChange={refresh}
          onOpenDeck={(id) => setView({ page: "deck", deckId: id })}
        />
      );
      break;
    case "stats":
      body = <StatsPage decks={decks} streak={streak} />;
      break;
    case "deck":
      if (!deck) {
        body = null;
        break;
      }
      body = (
        <DeckPage
          key={deck.updatedAt + ":" + deck.cards.length}
          deck={deck}
          onSave={save}
          onDelete={() => {
            store.deleteDeck(deck.id);
            refresh();
            setView({ page: "home" });
          }}
          onStudy={(mode) => setView({ page: "study", deckId: deck.id, mode })}
        />
      );
      break;
    case "study": {
      if (!deck || deck.cards.length === 0) {
        body = null;
        break;
      }
      body =
        view.mode === "flashcards" ? (
          <Flashcards key={deck.id} deck={deck} />
        ) : view.mode === "learn" ? (
          <Learn key={deck.id} deck={deck} />
        ) : WRITE_ENABLED && view.mode === "write" ? (
          <Write key={deck.id} deck={deck} />
        ) : view.mode === "quiz" ? (
          <Quiz key={deck.id} deck={deck} />
        ) : view.mode === "test" ? (
          <Test key={deck.id} deck={deck} />
        ) : (
          <Match key={deck.id} deck={deck} />
        );
      break;
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ ...frosted(settings.theme), borderBottom: 1, borderColor: "divider" }}>
          {view.page !== "home" && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() =>
                setView(
                  view.page === "study"
                    ? { page: "deck", deckId: view.deckId }
                    : view.page === "deck" && store.folderOfDeck(view.deckId)
                      ? { page: "folder", folderId: store.folderOfDeck(view.deckId)!.id }
                      : { page: "home" },
                )
              }
              sx={{ mr: 2 }}
              color="inherit"
            >
              Back
            </Button>
          )}
          <Typography variant="h6" component="div" onClick={() => setView({ page: "home" })} sx={{ cursor: "pointer", fontWeight: 700 }}>
            open<span style={{ color: "#4255ff" }}>Quizlet</span>
          </Typography>
          <Box sx={{ flex: 1 }} />
          {/* Level */}
          <LevelChip />
          {/* Streak */}
          <Tooltip title={`${streak.count}-day streak`}>
            <IconButton size="small" onClick={(e) => setStreakAnchor(e.currentTarget)} sx={{ ml: 1, color: streak.count > 0 ? "#ea580c" : "text.disabled" }}>
              <LocalFireDepartmentIcon fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800} sx={{ ml: 0.5 }}>{streak.count}</Typography>
            </IconButton>
          </Tooltip>
          <StreakPopover anchor={streakAnchor} onClose={() => setStreakAnchor(null)} streak={streak} />
          {/* Stats */}
          <IconButton size="small" sx={{ ml: 1 }} color="inherit" onClick={() => setView({ page: "stats" })}>
            <BarChartOutlinedIcon fontSize="small" />
          </IconButton>
          {/* Settings */}
          <IconButton size="small" sx={{ ml: 0.5 }} color="inherit" onClick={(e) => setSettingsMenu(e.currentTarget)}>
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu open={!!settingsMenu} anchorEl={settingsMenu} onClose={() => setSettingsMenu(null)}>
            <MenuItem onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}>
              <ListItemIcon>{settings.theme === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}</ListItemIcon>
              {settings.theme === "dark" ? "Light mode" : "Dark mode"}
            </MenuItem>
            <MenuItem onClick={() => updateSettings({ bgm: !settings.bgm })}>
              <ListItemIcon>{settings.bgm ? <MusicNoteOutlinedIcon fontSize="small" /> : <MusicOffOutlinedIcon fontSize="small" />}</ListItemIcon>
              Ambient music&nbsp;<Switch size="small" checked={settings.bgm} />
            </MenuItem>
            <MenuItem onClick={() => updateSettings({ sound: !settings.sound })}>
              <ListItemIcon>{settings.sound ? <VolumeUpOutlinedIcon fontSize="small" /> : <VolumeOffOutlinedIcon fontSize="small" />}</ListItemIcon>
              Sounds&nbsp;<Switch size="small" checked={settings.sound} />
            </MenuItem>
            {[...GOALS].map((g) => (
              <MenuItem key={g} selected={settings.dailyGoalXp === g} onClick={() => updateSettings({ dailyGoalXp: g })}>
                Daily goal: {g} XP
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {body}
      </Container>
    </Box>
  );
}

/* ---------- level chip with progress tooltip ---------- */

function LevelChip() {
  const [xp, setXp] = useState(() => loadXp().total);
  useEffect(() => {
    const update = () => setXp(loadXp().total);
    window.addEventListener("oq:xp", update);
    return () => window.removeEventListener("oq:xp", update);
  }, []);
  const info = levelInfo(xp);
  return (
    <Tooltip title={`Level ${info.level} · ${levelTitle(info.level)} — ${info.into}/${info.span} XP to next level`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "default", minWidth: 92 }}>
        <Box>
          <Typography variant="caption" fontWeight={700} lineHeight={1} component="div">
            Lv {info.level}
          </Typography>
          <LinearProgress variant="determinate" value={info.pct} sx={{ height: 4, borderRadius: 2, width: 56 }} />
        </Box>
      </Box>
    </Tooltip>
  );
}

/* ---------- streak popover: week dots ---------- */

function StreakPopover({ anchor, onClose, streak }: { anchor: HTMLElement | null; onClose: () => void; streak: Streak }) {
  const days = lastNDays(7);
  return (
    <Menu open={!!anchor} anchorEl={anchor} onClose={onClose}>
      <Box sx={{ px: 2, pt: 1, textAlign: "center" }}>
        <Typography variant="h4" color="#ea580c" fontWeight={800}>{streak.count}</Typography>
        <Typography variant="caption" color="text.secondary">day streak · best {streak.best}</Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1.5, mb: 1 }}>
          {days.map((d) => {
            const active = d.activity.xp > 0 || (d.date === todayKey() && streak.lastDay === d.date);
            return (
              <Tooltip key={d.date} title={d.date}>
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "grid", placeItems: "center",
                    bgcolor: active ? "#ea580c" : "action.hover",
                    color: active ? "#fff" : "text.disabled",
                    fontWeight: 700, fontSize: 12,
                  }}
                >
                  {d.label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", pb: 1 }}>
          Study any amount to keep the flame alive 🔥
        </Typography>
      </Box>
    </Menu>
  );
}
