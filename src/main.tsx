import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { HashRouter } from "react-router-dom"; // 👈 Importa o HashRouter

import App from "./App.tsx";
import { AuthProvider } from "./shared/auth/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
