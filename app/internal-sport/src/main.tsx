import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { FioriThemeProvider } from "./contexts/FioriThemeContext.tsx";
import { initFLPMessageListener } from "./hooks/useFLPSync";

// Initialize FLP message listener for iframe communication
initFLPMessageListener();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <FioriThemeProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e1e38",
              border: "1px solid #3a3a5a",
              color: "#f0f0f5",
            },
          }}
        />
      </FioriThemeProvider>
    </HashRouter>
  </StrictMode>,
);
