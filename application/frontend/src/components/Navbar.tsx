import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Info,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition",
    isActive
      ? "bg-[var(--color-peach)]/10 text-[var(--color-coral)]"
      : "text-stone-600 hover:bg-stone-100",
  ].join(" ");
}

export function Navbar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("getSession error:", error);

      setEmail(data.session?.user?.email ?? null);
      setLoadingAuth(false);
    });

    // Live updates for login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut error:", error);
      alert("Could not log out: " + error.message);
      return;
    }
    navigate("/login", { replace: true });
  };

  const isAuthed = !!email;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow group-hover:scale-[1.03] transition">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-lg text-stone-900">
              NoteNecklace
            </span>
            {isAuthed && (
              <span className="text-xs text-stone-500 truncate max-w-[180px]">
                {email}
              </span>
            )}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
