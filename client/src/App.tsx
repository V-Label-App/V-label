import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes/AppRoutes";
import { SocketProvider } from "./context/SocketContext";
import { logger } from "./utils/logger";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import "./App.css";

import { ChatWidget } from "./features/chat-widget/components/ChatWidget";
import { Toaster } from "./components/ui/sonner";

function App() {
  useEffect(() => {
    logger.debug("App component initialized with Router");

    // Tailwind Status Check
    const testDiv = document.createElement("div");
    testDiv.className = "hidden"; // Tailwind utility
    document.body.appendChild(testDiv);
    const computed = window.getComputedStyle(testDiv);
    if (computed.display === "none") {
      logger.success(
        "🎨 Tailwind CSS is ACTIVE (Verified via .hidden utility)",
      );
    } else {
      logger.warn(
        "⚠️ Tailwind CSS might NOT be working (Utility classes not applied)",
      );
    }
    document.body.removeChild(testDiv);
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <ImpersonationBanner />
        <AppRoutes />
        <ChatWidget />
        <Toaster position="top-right" richColors closeButton />
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
