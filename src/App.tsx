// React Router DOM
import { Navigate, Routes, Route } from "react-router-dom";

// Rotas
import LoginPage from "./pages/Login/page";
import HomePage from "./pages/home/page";
import ChatWindow from "./pages/chat/page";
import NotificationWindow from "./pages/notification/page";

// Style Sheet CSS
import "./App.css";
import { useAuth } from "./shared/auth/AuthContext";
import { LoadingScreen } from "./shared/components/LoadingScreen";

function ProtectedHome() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return user ? <HomePage /> : <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<ProtectedHome />} />
      <Route path="/chat/:id" element={<ChatWindow />} />
      <Route path="/notification" element={<NotificationWindow />} />
    </Routes>
  );
}

export default App;
