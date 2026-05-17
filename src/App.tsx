// React Router DOM
import { Routes, Route } from "react-router-dom";

// Rotas
import LoginPage from "./pages/Login/page";
import HomePage from "./pages/home/page";
import ChatWindow from "./pages/chat/page";

// Style Sheet CSS
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/chat/:id" element={<ChatWindow />} />
    </Routes>
  );
}

export default App;
