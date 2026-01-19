import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) navigate("/dashboard", { replace: true });
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center px-6">
      <form
        onSubmit={onLogin}
        className="w-full max-w-md bg-white border rounded-2xl shadow-md p-8"
      >
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Log in</h1>
        <p className="text-stone-600 mb-6">
          Use your account to access the dashboard.
        </p>

        <label className="block text-sm font-medium text-stone-700 mb-2">
          Email
        </label>
        <input
          className="w-full border rounded-xl px-4 py-3 mb-4"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label className="block text-sm font-medium text-stone-700 mb-2">
          Password
        </label>
        <input
          className="w-full border rounded-xl px-4 py-3 mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {errorMsg && (
          <div className="mb-4 text-sm text-red-600">{errorMsg}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 font-semibold text-white"
          style={{
            backgroundImage: "linear-gradient(90deg, #FF9B7F, #FF8A6D)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="mt-4 text-sm text-center text-stone-600">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="font-semibold underline underline-offset-4"
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
