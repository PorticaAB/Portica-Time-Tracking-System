import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import CalendarPage from "./pages/CalendarPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import ContractorsPage from "./pages/admin/ContractorsPage";
import ClientsProjectsPage from "./pages/admin/ClientsProjectsPage";
import HolidaysPage from "./pages/admin/HolidaysPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin/contractors" element={<ContractorsPage />} />
            <Route path="/admin/clients" element={<ClientsProjectsPage />} />
            <Route path="/admin/holidays" element={<HolidaysPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
