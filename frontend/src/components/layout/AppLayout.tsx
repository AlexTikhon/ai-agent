import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/notes", label: "Notes" },
  { to: "/chat", label: "Chat" },
  { to: "/files", label: "Files" },
  { to: "/automations", label: "Automations" }
];

// Handles AppLayout logic.
export const AppLayout = () => (
  <div className="min-h-screen grid grid-cols-1 md:grid-cols-[230px_1fr]">
    <aside className="bg-ink text-white p-5">
      <h1 className="text-xl font-semibold">Personal AI Workspace</h1>
      <nav className="mt-6 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 transition ${
                isActive ? "bg-accent text-white" : "text-slate-200 hover:bg-slate-700"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main className="p-6">
      <Outlet />
    </main>
  </div>
);
