import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)]">
      <Navbar />
      <main className="pt-8">
        {children}
      </main>
    </div>
  );
}
