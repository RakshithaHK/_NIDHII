import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewReport from "./pages/NewReport";
import IVR from "./pages/IVR";
import Reports from "./pages/Reports";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (role && !role.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-center" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
            <Route path="/new-report" element={<Protected><Layout><NewReport /></Layout></Protected>} />
            <Route path="/ivr" element={<Protected><Layout><IVR /></Layout></Protected>} />
            <Route path="/reports" element={<Protected><Layout><Reports /></Layout></Protected>} />
            <Route path="/leaderboard" element={<Protected><Layout><Leaderboard /></Layout></Protected>} />
            <Route path="/rewards" element={<Protected><Layout><Rewards /></Layout></Protected>} />
            <Route path="/chat" element={<Protected><Layout><Chat /></Layout></Protected>} />
            <Route path="/admin" element={<Protected role={["admin","supervisor"]}><Layout><Admin /></Layout></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
