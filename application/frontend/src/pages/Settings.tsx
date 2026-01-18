import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Wifi,
  Battery,
  Bluetooth,
  Moon,
  Sun,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Power,
  Signal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

export function Settings() {
  const [darkMode, setDarkMode] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Prototype UI values (replace with real device state later)
  const [batteryLevel] = useState(87);
  const [connectionStatus] = useState<ConnectionStatus>("connected");

  // --- Dark mode: persist per logged-in user (frontend only) ---
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;

        const uid = data.user?.id ?? "anonymous";
        const key = `settings:darkMode:${uid}`;
        const saved = localStorage.getItem(key);

        setDarkMode(saved === "true");
      } catch {
        // ignore
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const save = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;

        const uid = data.user?.id ?? "anonymous";
        const key = `settings:darkMode:${uid}`;
        localStorage.setItem(key, String(darkMode));
      } catch {
        // ignore
      }
    };

    save();

    // Optional: enable real dark theme later via Tailwind "dark:" variants
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");

    return () => {
      alive = false;
    };
  }, [darkMode]);

  // --- Delete notes: real Supabase call (frontend) ---
  const handleDeleteAllNotes = async () => {
    if (deleteLoading) return;

    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setDeleteError("You must be logged in to delete notes.");
        return;
      }

      // Assumes: table "notes" with column "user_id"
      const { error } = await supabase.from("notes").delete().eq("user_id", user.id);

      if (error) {
        setDeleteError(
          `Could not delete notes (table/columns or RLS may block this): ${error.message}`
        );
        return;
      }

      setDeleteConfirmOpen(false);
      setDeleteSuccess(true);
      window.setTimeout(() => setDeleteSuccess(false), 3000);
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    if (connectionStatus === "connected") {
      return {
        wrapper: "bg-emerald-100 border border-emerald-300",
        dot: "bg-emerald-500",
        text: "text-emerald-700",
        label: "Connected",
        pulse: true,
      };
    }
    if (connectionStatus === "connecting") {
      return {
        wrapper: "bg-[var(--color-peach)]/15 border border-[var(--color-coral)]/30",
        dot: "bg-[var(--color-coral)]",
        text: "text-[var(--color-coral)]",
        label: "Connecting",
        pulse: false,
      };
    }
    return {
      wrapper: "bg-red-100 border border-red-300",
      dot: "bg-red-500",
      text: "text-red-600",
      label: "Disconnected",
      pulse: false,
    };
  }, [connectionStatus]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-neutral-50)]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-br from-[var(--color-peach)]/20 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-tr from-stone-800/10 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.35, 0.18, 0.35] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="p-3 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl shadow-lg">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900">Settings</h1>
          </div>
          <p className="text-stone-600 text-base sm:text-lg">
            Manage your device, appearance, and data
          </p>
        </motion.div>

        {/* Success toast */}
        <AnimatePresence>
          {deleteSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="mb-5 sm:mb-6 p-4 bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-300 rounded-xl flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" />
              <span className="text-stone-900 font-medium">
                All notes have been deleted successfully
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {deleteError && (
          <div className="mb-5 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {deleteError}
          </div>
        )}

        <div className="space-y-5 sm:space-y-6">
          {/* Device Settings */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-xl border border-stone-200/50"
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="p-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-xl shadow">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-stone-900">Device Settings</h2>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Connection */}
              <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border border-stone-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center shadow-md shrink-0">
                      <Signal className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-stone-900 font-semibold leading-tight">Connection Status</div>
                      <div className="text-sm text-stone-600 truncate">NoteNecklace Pro</div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusBadge.wrapper} self-start sm:self-auto`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${statusBadge.dot} ${
                        statusBadge.pulse ? "animate-pulse" : ""
                      }`}
                    />
                    <span className={`text-sm font-medium ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-stone-600 mb-4">Last sync: 2 minutes ago</p>

                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-stone-100 border-2 border-stone-200 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  Reconnect Device
                </button>
              </div>

              {/* Battery */}
              <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border border-stone-200/60">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow-md shrink-0">
                      <Battery className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-stone-900 font-semibold leading-tight">Battery Level</div>
                      <div className="text-sm text-stone-600">Charging not required</div>
                    </div>
                  </div>

                  <div className="text-2xl sm:text-3xl font-bold text-[var(--color-coral)] shrink-0">
                    {batteryLevel}%
                  </div>
                </div>

                <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${batteryLevel}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Bluetooth */}
              <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border border-stone-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center shadow-md shrink-0">
                      <Bluetooth className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-stone-900 font-semibold leading-tight">Bluetooth</div>
                      <div className="text-sm text-stone-600">Version 5.2</div>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-stone-200 border border-stone-300 rounded-full w-fit">
                    <span className="text-sm font-medium text-stone-700">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Appearance */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-xl border border-stone-200/50"
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="p-3 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl">
                {darkMode ? <Moon className="w-6 h-6 text-white" /> : <Sun className="w-6 h-6 text-white" />}
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-stone-900">Appearance</h2>
            </div>

            <div className="flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-all border border-stone-200/60">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center shrink-0 shadow-md">
                {darkMode ? <Moon className="w-6 h-6 text-white" /> : <Sun className="w-6 h-6 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-stone-900 font-semibold">Dark Mode</div>

                  <motion.button
                    type="button"
                    onClick={() => setDarkMode((v) => !v)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      darkMode ? "bg-stone-700" : "bg-stone-300"
                    }`}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Toggle dark mode"
                  >
                    <motion.div
                      className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                      animate={{ x: darkMode ? 28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>

                <p className="text-sm text-stone-600 leading-relaxed">
                  Switch between light and dark theme (saved for your account)
                </p>
              </div>
            </div>
          </motion.section>

          {/* Data Management */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-xl border border-stone-200/50"
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-stone-900">Data Management</h2>
            </div>

            <div className="bg-red-50 rounded-xl p-4 sm:p-6 border border-red-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-stone-900 font-semibold mb-2">Delete All Notes</div>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    This action cannot be undone. All your recordings and transcriptions will be permanently deleted.
                  </p>
                </div>
              </div>

              {!deleteConfirmOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-red-100 border-2 border-red-300 text-red-600 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Notes
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-700 text-center">
                    Are you absolutely sure?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="py-3 px-4 rounded-xl bg-white hover:bg-stone-100 border-2 border-stone-300 text-stone-700 font-medium transition-all"
                      disabled={deleteLoading}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteAllNotes}
                      disabled={deleteLoading}
                      className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteLoading ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
