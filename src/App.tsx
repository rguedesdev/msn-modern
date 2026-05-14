// React Router DOM
import { Routes, Route } from "react-router-dom";

// Roatas
import LoginPage from "./pages/Login/page";
import HomePage from "./pages/home/page";

// Style Sheet CSS
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
    </Routes>
  );
}

export default App;
