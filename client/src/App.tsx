import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import TeamPage from "./pages/admin/TeamPage";
import ProjectsPage from "./pages/admin/ProjectsPage";
import HolidaysPage from "./pages/admin/HolidaysPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin/team" element={<TeamPage />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/holidays" element={<HolidaysPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
