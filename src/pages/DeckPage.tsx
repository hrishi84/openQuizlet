import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/EditOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import StyleOutlinedIcon from "@mui/icons-material/StyleOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { newCard, deckProgress, isLearned, isLeech } from "../types";
import type { Card as Flashcard, Deck } from "../types";
import type { StudyMode } from "../App";
import { WRITE_ENABLED } from "../App";
import * as store from "../storage";
import { csvToDeck } from "../io";

interface Props {
  deck: Deck;
  onSave: (deck: Deck) => void;
  onDelete: () => void;
  onStudy: (mode: StudyMode) => void;
}

export default function DeckPage({ deck, onSave, onDelete, onStudy }: Props) {
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [folderMenu, setFolderMenu] = useState<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const MODES: { mode: StudyMode; label: string; icon: React.ReactNode; color: string }[] = [
    { mode: "flashcards", label: "Flashcards", icon: <StyleOutlinedIcon />, color: "#4255ff" },
    { mode: "learn", label: "Learn", icon: <QuizOutlinedIcon />, color: "#7c3aed" },
    ...(WRITE_ENABLED ? [{ mode: "write" as StudyMode, label: "Write", icon: <KeyboardOutlinedIcon />, color: "#0d9488" }] : []),
    { mode: "quiz", label: "Quiz", icon: <EditNoteOutlinedIcon />, color: "#ea580c" },
    { mode: "test", label: "Test", icon: <AssignmentOutlinedIcon />, color: "#0891b2" },
    { mode: "match", label: "Match", icon: <ExtensionOutlinedIcon />, color: "#db2777" },
  ];

  const mutate = (fn: (d: Deck) => void) => {
    const copy = structuredClone(deck);
    fn(copy);
    onSave(copy);
  };

  const importCsv = (file: File) =>
    file.text().then((text) => {
      mutate((d) => d.cards.push(...csvToDeck(d.name, text).cards));
    });

  const folder = store.folderOfDeck(deck.id);
  const folders = store.loadFolders();
  const pct = Math.round(deckProgress(deck) * 100);
  const learned = deck.cards.filter(isLearned).length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Box>
          <Typography variant="h4">{deck.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {deck.cards.length} terms · {pct}% mastered ({learned}/{deck.cards.length})
          </Typography>
        </Box>
        <Box>
          <Button startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} color="inherit">
            Import CSV
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setEditing(newCard())} sx={{ ml: 1 }}>
            Add card
          </Button>
        </Box>
      </Box>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
        <Button
          size="small"
          color="inherit"
          startIcon={<FolderOutlinedIcon />}
          onClick={(e) => setFolderMenu(e.currentTarget)}
        >
          {folder ? folder.name : "Move to folder"}
        </Button>
        <Menu open={!!folderMenu} anchorEl={folderMenu} onClose={() => setFolderMenu(null)}>
          {folders.map((f) => (
            <MenuItem
              key={f.id}
              selected={folder?.id === f.id}
              onClick={() => {
                store.addDeckToFolder(f.id, deck.id);
                setFolderMenu(null);
                onSave({ ...deck });
              }}
            >
              {f.name}
            </MenuItem>
          ))}
          {folder && (
            <MenuItem
              onClick={() => {
                store.removeDeckFromFolder(folder.id, deck.id);
                setFolderMenu(null);
                onSave({ ...deck });
              }}
            >
              Remove from folder
            </MenuItem>
          )}
        </Menu>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {MODES.map((m) => (
          <Grid size={{ xs: 6, sm: "auto" }} key={m.mode}>
            <Button
              disabled={deck.cards.length === 0}
              onClick={() => onStudy(m.mode)}
              startIcon={m.icon}
              variant="outlined"
              sx={{ borderColor: "divider", color: m.color, "& .MuiSvgIcon-root": { color: m.color }, width: "100%" }}
            >
              {m.label}
            </Button>
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Button color="error" size="small" onClick={() => setConfirmDelete(true)}>
            Delete deck
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {deck.cards.map((c, i) => (
        <Card key={c.id} sx={{ mb: 1.5 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 2 }}>
            <Typography sx={{ width: 24 }} color="text.secondary" variant="body2">
              {i + 1}
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Typography>
                {c.term} {isLeech(c) && <Chip size="small" label="🩸 leech" color="error" variant="outlined" sx={{ ml: 1 }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {c.definition}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setEditing(c)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => mutate((d) => void (d.cards = d.cards.filter((x) => x.id !== c.id)))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.term || editing?.definition ? "Edit card" : "New card"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            label="Term"
            margin="normal"
            value={editing?.term ?? ""}
            onChange={(e) => setEditing((p) => p && { ...p, term: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            label="Definition"
            margin="normal"
            value={editing?.definition ?? ""}
            onChange={(e) => setEditing((p) => p && { ...p, definition: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editing) return;
              if (!editing.term.trim() && !editing.definition.trim()) return;
              mutate((d) => {
                const i = d.cards.findIndex((x) => x.id === editing.id);
                if (i >= 0) d.cards[i] = editing;
                else d.cards.push(editing);
              });
              setEditing(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle>Delete “{deck.name}”?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
