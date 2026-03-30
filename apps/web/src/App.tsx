import { Navigate, Route, Routes } from "react-router-dom";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminRulesPage from "./pages/AdminRulesPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/rules"
        element={
          <AdminRoute>
            <AdminRulesPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <AdminRoute>
            <AdminLogsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
