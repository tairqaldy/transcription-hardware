import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";

import { Home } from "@/pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MyAccountPage } from "@/pages/MyAccountPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/loginPage";
import { SignupPage } from "@/pages/SignupPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected pages */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />

          <Route
            path="/account"
            element={
              <RequireAuth>
                <MyAccountPage />
              </RequireAuth>
            }
          />

          <Route
            path="/account/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
