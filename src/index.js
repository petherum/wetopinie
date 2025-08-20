import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/* 🔧 Motyw Vet4You (light + dark tokens) */
import "./theme/vet4you.css";

/* 🌓 Ustaw klasę dark jak najwcześniej, żeby uniknąć FOUC */
(() => {
  try {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    document.body.classList.toggle("theme-dark", isDark);
  } catch {
    // w razie braku dostępu do localStorage – nic nie robimy
  }
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
