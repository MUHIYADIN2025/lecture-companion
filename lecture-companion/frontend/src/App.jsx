import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import LectureDashboard from "./pages/LectureDashboard";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LectureDashboard />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}
