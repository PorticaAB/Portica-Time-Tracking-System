import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import clsx from "../../lib/clsx";

const contractorLinks = [
  { to: "/", label: "Calendar" },
  { to: "/reports", label: "Reports" },
  { to: "/profile", label: "Profile" },
];

const adminLinks = [
  { to: "/", label: "Calendar" },
  { to: "/admin/contractors", label: "Contractors" },
  { to: "/admin/clients", label: "Clients & Projects" },
  { to: "/admin/holidays", label: "Holidays" },
  { to: "/reports", label: "Reports" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const links = user?.role === "ADMIN" ? adminLinks : contractorLinks;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="font-display text-xl font-semibold tracking-tight text-brand-700">Klocka</span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:bg-line-soft hover:text-ink"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">{user?.name}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-line px-3 py-1.5 text-ink-muted transition-all duration-150 hover:bg-line-soft hover:text-ink active:scale-[0.98]"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
