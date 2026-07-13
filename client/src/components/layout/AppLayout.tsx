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
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="text-lg font-semibold text-brand-700">Portica Time</span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user?.name}</span>
          <button
            onClick={logout}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
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
