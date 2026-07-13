import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import clsx from "../../lib/clsx";

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("h-[18px] w-[18px]", className)}
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  team: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75",
  reports: "M3 3v18h18M8 17V9m5 8V5m5 12v-6",
  admin: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.14-1.4l2.1-1.63-2-3.46-2.48 1a7.5 7.5 0 0 0-2.42-1.4L14 2h-4l-.46 2.6a7.5 7.5 0 0 0-2.42 1.4l-2.48-1-2 3.46 2.1 1.63a7.4 7.4 0 0 0 0 2.8l-2.1 1.63 2 3.46 2.48-1c.72.6 1.53 1.07 2.42 1.4L10 22h4l.46-2.6a7.5 7.5 0 0 0 2.42-1.4l2.48 1 2-3.46-2.1-1.63c.09-.46.14-.93.14-1.4Z",
  chevron: "M9 18l6-6-6-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

const contractorLinks = [
  { to: "/", label: "Dashboard", icon: ICONS.dashboard },
  { to: "/calendar", label: "Calendar", icon: ICONS.calendar },
  { to: "/reports", label: "Reports", icon: ICONS.reports },
];

const adminLinks = [
  { to: "/", label: "Dashboard", icon: ICONS.dashboard },
  { to: "/calendar", label: "Calendar", icon: ICONS.calendar },
  { to: "/admin/team", label: "Team", icon: ICONS.team },
  { to: "/reports", label: "Reports", icon: ICONS.reports },
];

const adminSubLinks = [
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/holidays", label: "Holidays" },
];

function navLinkClass(isActive: boolean) {
  return clsx(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
    isActive ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:bg-line-soft hover:text-ink"
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "ADMIN";
  const links = isAdmin ? adminLinks : contractorLinks;
  const adminSectionActive = location.pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(adminSectionActive);

  const initials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = isAdmin ? "Admin" : user?.memberRole === "COACH" ? "Coach" : "Team member";

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 flex-none flex-col border-r border-line bg-surface">
        <div className="px-5 pt-6 pb-5">
          <span className="font-display text-2xl font-semibold tracking-tight text-brand-700">Klocka</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={({ isActive }) => navLinkClass(isActive)}>
              <Icon path={link.icon} />
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <div>
              <button
                onClick={() => setAdminOpen((v) => !v)}
                className={navLinkClass(adminSectionActive && !adminOpen) + " w-full"}
              >
                <Icon path={ICONS.admin} />
                Admin
                <Icon path={ICONS.chevron} className={clsx("ml-auto transition-transform duration-150", adminOpen && "rotate-90")} />
              </button>
              {adminOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
                  {adminSubLinks.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      className={({ isActive }) =>
                        clsx(
                          "block rounded-lg px-3 py-2 text-sm transition-all duration-150",
                          isActive ? "bg-brand-50 font-medium text-brand-700" : "text-ink-muted hover:bg-line-soft hover:text-ink"
                        )
                      }
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="border-t border-line p-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
                isActive ? "bg-brand-50" : "hover:bg-line-soft"
              )
            }
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials || "?"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{user?.name}</span>
              <span className="block truncate text-xs text-ink-faint">{roleLabel}</span>
            </span>
          </NavLink>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-all duration-150 hover:bg-line-soft hover:text-ink"
          >
            <Icon path={ICONS.logout} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden bg-canvas">
        <Outlet />
      </main>
    </div>
  );
}
