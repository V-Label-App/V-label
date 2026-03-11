import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";

import { logger } from "./utils/logger";

logger.info("Application starting...");
logger.success("Environment:", import.meta.env.MODE);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
