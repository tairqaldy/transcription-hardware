import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  User,
  Info,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,

} from "lucide-react";
import { supabase } from "@/lib/supabase";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition",
    isActive
      ? "bg-[var(--color-peach)]/10 text-[var(--color-coral)]"
      : "text-stone-600 hover:bg-stone-100",
  ].join(" ");
}

function mobileItemClass({ isActive }: { isActive: boolean }) {
  return [
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
    isActive
      ? "bg-[var(--color-peach)]/12 text-[var(--color-coral)]"
      : "text-stone-700 hover:bg-stone-100",
  ].join(" ");
}

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthed = !!email;

  const closeMobile = () => setMobileOpen(false);

  
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) console.error("getSession error:", error);
        setEmail(data.session?.user?.email ?? null);
      } catch (e) {
        console.error("getSession threw:", e);
        if (!alive) return;
        setEmail(null);
      } finally {
        if (alive) setLoadingAuth(false);
      }
    };

    init();

    const { data } = supabase.auth.onAuthStateChange(
  (_event: AuthChangeEvent, session: Session | null) => {
    if (!alive) return;
    setEmail(session?.user?.email ?? null);
    setLoadingAuth(false);
  }
);

    return () => {
      alive = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  const onLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("signOut error:", error);
        alert("Could not log out: " + error.message);
        return;
      }
      navigate("/login", { replace: true });
    } finally {
      closeMobile();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group" onClick={closeMobile}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow group-hover:scale-[1.03] transition">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-lg text-stone-900">Noting</span>
            {isAuthed && (
              <span className="text-xs text-stone-500 truncate max-w-[180px] sm:max-w-[240px]">
                {email}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          <NavLink to="/about" className={navClass}>
            <Info className="w-4 h-4" />
            About
          </NavLink>

          {!loadingAuth && isAuthed && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>

              <NavLink to="/account" className={navClass}>
                <User className="w-4 h-4" />
                My Account
              </NavLink>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition text-stone-600 hover:bg-stone-100"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </>
          )}

          {!loadingAuth && !isAuthed && (
            <>
              <NavLink to="/signup" className={navClass}>
                <UserPlus className="w-4 h-4" />
                Sign up
              </NavLink>

              <NavLink to="/login" className={navClass}>
                <LogIn className="w-4 h-4" />
                Log in
              </NavLink>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-stone-700 hover:bg-stone-100 transition"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="grid gap-2">
              <NavLink to="/about" className={mobileItemClass}>
                <Info className="w-4 h-4" />
                About
              </NavLink>

              {!loadingAuth && isAuthed && (
                <>
                  <NavLink to="/dashboard" className={mobileItemClass}>
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </NavLink>

                  <NavLink to="/account" className={mobileItemClass}>
                    <User className="w-4 h-4" />
                    My Account
                  </NavLink>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition text-stone-700 hover:bg-stone-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </>
              )}

              {!loadingAuth && !isAuthed && (
                <>
                  <NavLink to="/signup" className={mobileItemClass}>
                    <UserPlus className="w-4 h-4" />
                    Sign up
                  </NavLink>

                  <NavLink to="/login" className={mobileItemClass}>
                    <LogIn className="w-4 h-4" />
                    Log in
                  </NavLink>
                </>
              )}

              {loadingAuth && (
                <div className="rounded-xl px-3 py-3 text-sm text-stone-500">Loading…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
