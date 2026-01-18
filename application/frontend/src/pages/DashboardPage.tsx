import { Dashboard } from "@/components/Dashboard";

export function DashboardPage() {
  return <Dashboard apiBaseUrl={import.meta.env.VITE_AI_API_URL} />;
}
