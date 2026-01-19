import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // If email confirmations are enabled, session might be null.
    // In that case, user must confirm email before logging in.
    if (!data.session) {
      setSuccessMsg("Account created! Please check your email to confirm, then log in.");
      return;
    }

    // If session exists, user is already logged in
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center px-6">
      <form
        onSubmit={onSignup}
        className="w-full max-w-md bg-white border rounded-2xl shadow-md p-8"
      >
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Create account</h1>
        <p className="text-stone-600 mb-6">Sign up to start using the app.</p>

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
          autoComplete="new-password"
        />

        {errorMsg && <div className="mb-4 text-sm text-red-600">{errorMsg}</div>}
        {successMsg && (
          <div className="mb-4 text-sm text-emerald-700">{successMsg}</div>
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
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="mt-4 text-sm text-center text-stone-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold underline underline-offset-4"
          >
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}
