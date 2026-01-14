import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Smartphone,
  Package,
  Wifi,
  CheckCircle2,
  Crown,
  Award,
  TrendingUp,
  Settings as SettingsIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function MyAccount() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState<string>("Loading...");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user?.email) {
        setUserEmail("Unknown");
        return;
      }
      setUserEmail(data.user.email);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
    navigate("/login");
  };

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900">My Account</h1>

              <div className="px-3 py-1 bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] rounded-full flex items-center gap-1.5 shadow">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Pro</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-stone-200 bg-white hover:bg-stone-50 transition disabled:opacity-60"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>

          <p className="text-stone-600 text-base sm:text-lg">
            Manage your profile and device
          </p>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            delay={0.1}
            variant="peach"
            icon={<Award className="w-7 h-7 sm:w-8 sm:h-8 opacity-90" />}
            value="47"
            label="Notes Created"
          />
          <StatCard
            delay={0.2}
            variant="stone1"
            icon={<TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 opacity-80" />}
            value="12.4h"
            label="Total Recording Time"
          />
          <StatCard
            delay={0.3}
            variant="stone2"
            icon={<Crown className="w-7 h-7 sm:w-8 sm:h-8 opacity-80" />}
            value="98%"
            label="Accuracy Rate"
          />
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="p-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-xl shadow">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-stone-900">Profile Information</h3>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <Field label="Full Name" icon={<User className="w-5 h-5" />} defaultValue="Prototype User" />
              <Field
                label="Email"
                icon={<Mail className="w-5 h-5" />}
                defaultValue={userEmail}
                type="email"
                readOnly
              />
              <Field label="Phone" icon={<Smartphone className="w-5 h-5" />} defaultValue="+1 (555) 123-4567" type="tel" />
            </div>

            <p className="mt-4 text-xs text-stone-500 leading-relaxed">
              Note: Name/phone are prototype UI for now. Email is loaded from Supabase Auth.
            </p>
          </motion.div>

          {/* Device Information */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 sm:p-8 shadow-xl text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-peach)]/20 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Device Information</h3>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow-lg">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">Device Model</div>
                      <div className="font-semibold">NoteNecklace Pro</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-white/10 flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white/70">Serial Number</div>
                      <div className="font-mono text-sm truncate">NN-2024-XJ9K-L4M2</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-emerald-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span className="font-semibold">Device Status</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Your device is active and functioning normally. Last sync: 2 minutes ago.
                  </p>
                </div>

                <button className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-medium transition-all">
                  Unpair Device
                </button>
              </div>
            </div>
          </motion.div>

          {/* Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="md:col-span-2 bg-white rounded-2xl p-5 sm:p-8 shadow-xl border border-stone-200/50"
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-8">
              <div className="p-3 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-stone-900">Settings & Preferences</h3>
            </div>

            <button
              type="button"
              onClick={() => navigate("/account/settings")}
              className="w-full text-left flex items-center justify-between gap-4 p-4 sm:p-6 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100/50 hover:from-stone-100 hover:to-stone-50 transition-all border border-stone-200/50 hover:border-stone-300 hover:shadow-lg group"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-stone-900 mb-1 font-semibold group-hover:text-[var(--color-coral)] transition-colors">
                    Manage Settings
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Device settings, dark mode, data management, and more
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-stone-400 group-hover:text-[var(--color-coral)] group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  delay,
  variant,
  icon,
  value,
  label,
}: {
  delay: number;
  variant: "peach" | "stone1" | "stone2";
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  const bg =
    variant === "peach"
      ? "bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)]"
      : variant === "stone1"
      ? "bg-gradient-to-br from-stone-700 to-stone-800"
      : "bg-gradient-to-br from-stone-800 to-stone-900";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`${bg} rounded-2xl p-5 sm:p-6 text-white shadow-xl`}
    >
      <div className="mb-3">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-90">{label}</div>
    </motion.div>
  );
}

function Field({
  label,
  defaultValue,
  icon,
  type = "text",
  readOnly = false,
}: {
  label: string;
  defaultValue: string;
  icon: React.ReactNode;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-600 mb-2">
        {label}
      </label>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-hover:text-[var(--color-coral)] transition-colors">
          {icon}
        </div>

        <input
          type={type}
          defaultValue={defaultValue}
          readOnly={readOnly}
          className={[
            "w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-xl bg-stone-50 border-2 border-stone-200 outline-none text-stone-900 transition-all",
            "focus:border-[var(--color-coral)] focus:bg-white",
            "text-base sm:text-[15px]",
            readOnly ? "opacity-80 cursor-not-allowed" : "",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
