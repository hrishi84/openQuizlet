import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App";
import { darkTheme, lightTheme } from "./theme";
import { loadSettings } from "./gamification";

function Root() {
  const [mode, setMode] = useState(loadSettings().theme);
  // settings changes re-mount via key below; also listen for storage-driven updates
  useEffect(() => {
    const iv = setInterval(() => {
      const t = loadSettings().theme;
      setMode((m) => (m !== t ? t : m));
    }, 500);
    return () => clearInterval(iv);
  }, []);
  return (
    <ThemeProvider theme={mode === "dark" ? darkTheme : lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
