import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { HashRouter } from "react-router-dom"; // 👈 Importa o HashRouter

import App from "./App.tsx";
import { AuthProvider } from "./shared/auth/AuthContext.tsx";
import { ThemeProvider } from "./shared/theme/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);
