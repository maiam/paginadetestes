import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

type ThemeMode = "light" | "dark" | "system";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark);

  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", mode);
}

const savedTheme =
  (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
applyTheme(savedTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
