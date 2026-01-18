import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, User, Info } from "lucide-react";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition",
    isActive
      ? "bg-[var(--color-peach)]/10 text-[var(--color-coral)]"
      : "text-stone-600 hover:bg-stone-100",
  ].join(" ");
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo (click → Home) */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow group-hover:scale-[1.03] transition">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-stone-900">NoteNecklace</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <NavLink to="/dashboard" className={navClass}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>

          <NavLink to="/account" className={navClass}>
            <User className="w-4 h-4" />
            My Account
          </NavLink>

          <NavLink to="/about" className={navClass}>
            <Info className="w-4 h-4" />
            About
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
