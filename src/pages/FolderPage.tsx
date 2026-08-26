import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { combinedProgress, deckProgress } from "../types";
import type { Deck } from "../types";
import * as store from "../storage";

interface Props {
  decks: Deck[];
  folderId: string;
  onChange: () => void;
  onOpenDeck: (id: string) => void;
}

/** Folder view: sets inside a folder with aggregate progress + add/remove sets. */
export default function FolderPage({ decks, folderId, onChange, onOpenDeck }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const folder = store.loadFolders().find((f) => f.id === folderId);

  if (!folder) return <Typography color="text.secondary">Folder not found.</Typography>;

  const inFolder = decks.filter((d) => folder.deckIds.includes(d.id));
  const addable = decks.filter((d) => !folder.deckIds.includes(d.id));
  const pct = combinedProgress(inFolder);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h4">{folder.name}</Typography>
          <Button startIcon={<AddIcon />} onClick={() => setAddOpen(true)} disabled={addable.length === 0}>
            Add set
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {inFolder.length} {inFolder.length === 1 ? "set" : "sets"} · {pct}% mastered
        </Typography>
        <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
      </Box>

      {inFolder.length === 0 && <Typography color="text.secondary">This folder is empty. Add a set to get started.</Typography>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {inFolder.map((d) => {
          const dp = Math.round(deckProgress(d) * 100);
          return (
            <Card key={d.id} sx={{ position: "relative" }}>
              <CardActionArea onClick={() => onOpenDeck(d.id)}>
                <CardContent sx={{ pr: 6 }}>
                  <Typography variant="h6">{d.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.cards.length} terms · {dp}% mastered
                  </Typography>
                  <LinearProgress variant="determinate" value={dp} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
                </CardContent>
              </CardActionArea>
              <IconButton
                size="small"
                sx={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => setMenuFor({ id: d.id, anchor: e.currentTarget })}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              {menuFor?.id === d.id && (
                <Menu open anchorEl={menuFor.anchor} onClose={() => setMenuFor(null)}>
                  <MenuItem
                    onClick={() => {
                      store.removeDeckFromFolder(folder.id, d.id);
                      setMenuFor(null);
                      onChange();
                    }}
                  >
                    Remove from folder
                  </MenuItem>
                </Menu>
              )}
            </Card>
          );
        })}
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add set to “{folder.name}”</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1 }}>
          {addable.map((d) => (
            <Button
              key={d.id}
              variant="outlined"
              onClick={() => {
                store.addDeckToFolder(folder.id, d.id);
                setAddOpen(false);
                onChange();
              }}
              sx={{ justifyContent: "space-between", borderColor: "divider", color: "text.primary" }}
            >
              {d.name}
              <Typography variant="caption" color="text.secondary">{d.cards.length} terms</Typography>
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
