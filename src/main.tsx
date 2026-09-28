import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./styles/app.css";
import { App } from "./App";
import "@capacitor/core";
import { NATIVE, PREVIEW } from "./config";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support for the app itself. Moodle data is cached separately, per account.
if (import.meta.env.PROD && !PREVIEW && !NATIVE && "serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
