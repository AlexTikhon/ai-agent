import { FormEvent, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuthStore } from "./store/auth.store";
import { DashboardPage } from "./pages/DashboardPage";
import { NotesPage } from "./pages/NotesPage";
import { ChatPage } from "./pages/ChatPage";
import { FilesPage } from "./pages/FilesPage";
import { AutomationsPage } from "./pages/AutomationsPage";

// Handles AuthScreen logic.
const AuthScreen = () => {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("demo@example.com");
  const [name, setName] = useState("Demo User");
  const [password, setPassword] = useState("password123");
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  // Handles onSubmit logic.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "login") await login(email, password);
    else await register(email, name, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form className="card max-w-md w-full flex flex-col gap-3" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold">Personal AI Workspace</h1>
        <input
          className="border rounded-lg p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === "register" && (
          <input
            className="border rounded-lg p-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="border rounded-lg p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-accent text-white rounded-lg p-2" type="submit">
          {mode === "login" ? "Log in" : "Create account"}
        </button>
        <button
          className="text-sm text-slate-500"
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          Switch to {mode === "login" ? "register" : "login"}
        </button>
      </form>
    </div>
  );
};

// Handles App logic.
export const App = () => {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <AuthScreen />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/automations" element={<AutomationsPage />} />
      </Route>
    </Routes>
  );
};
