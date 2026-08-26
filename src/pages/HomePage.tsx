import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import LinearProgress from "@mui/material/LinearProgress";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { combinedProgress, deckProgress, newDeck, newFolder } from "../types";
import type { Deck } from "../types";
import * as store from "../storage";
import { csvToDeck, deckToCsv, exportJson, importJson } from "../io";
import { loadSettings, loadXp, todayKey } from "../gamification";
import type { Streak } from "../storage";

interface Props {
  decks: Deck[];
  onSave: (deck: Deck) => void;
  onOpen: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onChange: () => void;
  streak: Streak;
}

function GoalRing({ value, max }: { value: number; max: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, max));
  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx={42} cy={42} r={r} fill="none" stroke="currentColor" opacity={0.12} strokeWidth={7} />
      <circle
        cx={42} cy={42} r={r} fill="none"
        stroke={pct >= 1 ? "#16a34a" : "#4255ff"}
        strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 42 42)"
        style={{ transition: "stroke-dasharray .6s ease" }}
      />
      <text x={42} y={40} textAnchor="middle" fontSize={13} fontWeight={800} fill="currentColor">
        {Math.round(value)}
      </text>
      <text x={42} y={54} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
        / {max} XP
      </text>
    </svg>
  );
}

function GoalRingLive({ max }: { max: number }) {
  const [xp, setXp] = useState(() => loadXp().days[todayKey()]?.xp ?? 0);
  useEffect(() => {
    const update = () => setXp(loadXp().days[todayKey()]?.xp ?? 0);
    window.addEventListener("oq:xp", update);
    return () => window.removeEventListener("oq:xp", update);
  }, []);
  return <GoalRing value={xp} max={max} />;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function download(filename: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function HomePage({ decks, onSave, onOpen, onOpenFolder, onChange, streak }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [name, setName] = useState("");
  const [menuFor, setMenuFor] = useState<{ id: string; kind: "deck" | "folder"; anchor: HTMLElement } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const folders = store.loadFolders();
  const unfiledDecks = decks.filter((d) => !folders.some((f) => f.deckIds.includes(d.id)));

  const create = () => {
    if (!name.trim()) return;
    onSave(newDeck(name.trim()));
    setName("");
    setCreateOpen(false);
  };

  const createFolder = () => {
    if (!name.trim()) return;
    store.upsertFolder(newFolder(name.trim()));
    setName("");
    setFolderOpen(false);
    onChange();
  };

  const importFile = (file: File, kind: "csv" | "json") => {
    file.text().then((text) => {
      try {
        if (kind === "json") {
          const { decks: imported, folders } = importJson(text);
          for (const d of imported) onSave(d);
          for (const f of folders) store.upsertFolder(f);
          onChange();
        } else {
          onSave(csvToDeck(file.name.replace(/\.csv$/i, ""), text));
        }
      } catch (e) {
        alert(`Import failed: ${e instanceof Error ? e.message : e}`);
      }
    });
  };

  const closeMenu = () => setMenuFor(null);

  return (
    <Box>
      {/* Hero: greeting, streak, daily goal */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, py: 3 }}>
          <GoalRingLive max={loadSettings().dailyGoalXp} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">{greeting()} 👋</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {(loadXp().days[todayKey()]?.answers ?? 0) > 0
                ? `${loadXp().days[todayKey()]!.answers} answered today · keep it up!`
                : "Start a session to hit your daily goal."}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
              <Chip size="small" icon={<LocalFireDepartmentIcon />} label={`${streak.count}-day streak`} sx={{ bgcolor: "#fff3e0", color: "#ea580c", "& .MuiChip-icon": { color: "#ea580c" } }} />
              <Chip size="small" label={`Best: ${streak.best}`} variant="outlined" />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Library</Typography>
        <Box>
          <Button startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} color="inherit">
            Import CSV
          </Button>
          <Button startIcon={<UploadFileIcon />} onClick={() => jsonRef.current?.click()} color="inherit" sx={{ mr: 1 }}>
            Import JSON
          </Button>
          <Button startIcon={<CreateNewFolderOutlinedIcon />} onClick={() => { setName(""); setFolderOpen(true); }} sx={{ mr: 1 }}>
            New folder
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setName(""); setCreateOpen(true); }}>
            New deck
          </Button>
        </Box>
      </Box>

      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0], "csv")} />
      <input ref={jsonRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0], "json")} />

      {/* Folders */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">Folders</Typography>
        <Typography variant="body2" color="text.secondary">
          {combinedProgress(decks)}% overall
        </Typography>
      </Box>
      <LinearProgress value={combinedProgress(decks)} variant="determinate" sx={{ mb: 2, height: 6, borderRadius: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mb: 4 }}>
        {folders.map((f) => {
          const fDecks = decks.filter((d) => f.deckIds.includes(d.id));
          const pct = combinedProgress(fDecks);
          return (
            <Card key={f.id} sx={{ position: "relative" }}>
              <CardActionArea onClick={() => onOpenFolder(f.id)}>
                <CardContent sx={{ pr: 6 }}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                    <FolderOutlinedIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1">{f.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {f.deckIds.length} {f.deckIds.length === 1 ? "set" : "sets"} · {pct}% mastered
                  </Typography>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
                </CardContent>
              </CardActionArea>
              <IconButton
                size="small"
                sx={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => setMenuFor({ id: f.id, kind: "folder", anchor: e.currentTarget })}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Card>
          );
        })}
      </Box>

      {/* Unfiled sets */}
      <Typography variant="h6" sx={{ mb: 1 }}>Sets</Typography>
      {unfiledDecks.length === 0 && (
        <Typography color="text.secondary">No loose sets. Create one or import a CSV of term,definition pairs.</Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {unfiledDecks.map((d) => {
          const pct = Math.round(deckProgress(d) * 100);
          return (
            <Card key={d.id} sx={{ position: "relative" }}>
              <CardActionArea onClick={() => onOpen(d.id)}>
                <CardContent sx={{ pr: 6 }}>
                  <Typography variant="h6">{d.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.cards.length} {d.cards.length === 1 ? "term" : "terms"} · {pct}% mastered
                  </Typography>
                  <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
                </CardContent>
              </CardActionArea>
              <IconButton
                size="small"
                sx={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => setMenuFor({ id: d.id, kind: "deck", anchor: e.currentTarget })}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Card>
          );
        })}
      </Box>

      {/* Menus */}
      <Menu open={menuFor?.kind === "deck"} anchorEl={menuFor?.anchor} onClose={closeMenu}>
        {menuFor?.kind === "deck" && (
          [
            <MenuItem key="csv" onClick={() => { const d = decks.find((x) => x.id === menuFor.id)!; download(`${d.name}.csv`, deckToCsv(d)); closeMenu(); }}>
              Export CSV
            </MenuItem>,
            <MenuItem key="json" onClick={() => { const d = decks.find((x) => x.id === menuFor.id)!; download(`${d.name}.json`, exportJson([d])); closeMenu(); }}>
              Export JSON
            </MenuItem>,
            ...folders.map((f) => (
              <MenuItem key={f.id} onClick={() => { store.addDeckToFolder(f.id, menuFor.id); onChange(); closeMenu(); }}>
                Move to “{f.name}”
              </MenuItem>
            )),
            folders.length > 0 && (
              <MenuItem key="unfile" onClick={() => { for (const f of folders) if (f.deckIds.includes(menuFor.id)) store.removeDeckFromFolder(f.id, menuFor.id); onChange(); closeMenu(); }}>
                Remove from folder
              </MenuItem>
            ),
          ].filter(Boolean)
        )}
      </Menu>
      <Menu open={menuFor?.kind === "folder"} anchorEl={menuFor?.anchor} onClose={closeMenu}>
        {menuFor?.kind === "folder" && (
          <MenuItem onClick={() => { store.deleteFolder(menuFor.id); onChange(); closeMenu(); }}>Delete folder</MenuItem>
        )}
      </Menu>

      {/* New deck dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New deck</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Deck name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createFolder}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
