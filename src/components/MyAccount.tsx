import React from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MyAccount() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-neutral-50)]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--color-peach)]/20 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-stone-800/10 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-stone-900">My Account</h1>
            <div className="px-3 py-1 bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] rounded-full flex items-center gap-1.5 shadow">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Pro</span>
            </div>
          </div>
          <p className="text-stone-600 text-lg">Manage your profile and device</p>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-2xl p-6 text-white shadow-xl"
          >
            <Award className="w-8 h-8 mb-3 opacity-90" />
            <div className="text-3xl font-bold mb-1">47</div>
            <div className="text-sm opacity-90">Notes Created</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-stone-700 to-stone-800 rounded-2xl p-6 text-white shadow-xl"
          >
            <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
            <div className="text-3xl font-bold mb-1">12.4h</div>
            <div className="text-sm opacity-90">Total Recording Time</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl"
          >
            <Crown className="w-8 h-8 mb-3 opacity-80" />
            <div className="text-3xl font-bold mb-1">98%</div>
            <div className="text-sm opacity-90">Accuracy Rate</div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-stone-200/50 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-xl shadow">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-stone-900">Profile Information</h3>
            </div>

            <div className="space-y-5">
              <Field label="Full Name" icon={<User className="w-5 h-5" />} defaultValue="Sarah Johnson" />
              <Field label="Email" icon={<Mail className="w-5 h-5" />} defaultValue="sarah.j@example.com" type="email" />
              <Field label="Phone" icon={<Smartphone className="w-5 h-5" />} defaultValue="+1 (555) 123-4567" type="tel" />
            </div>
          </motion.div>

          {/* Device Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-peach)]/20 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white">Device Information</h3>
              </div>

              <div className="space-y-5">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] flex items-center justify-center shadow-lg">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70 mb-1">Device Model</div>
                      <div className="font-semibold">NoteNecklace Pro</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70 mb-1">Serial Number</div>
                      <div className="font-mono text-sm">NN-2024-XJ9K-L4M2</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm rounded-xl p-5 border border-emerald-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span className="font-semibold">Device Status</span>
                  </div>
                  <p className="text-sm text-white/80">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="md:col-span-2 bg-white rounded-2xl p-8 shadow-xl border border-stone-200/50"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-stone-900">Settings & Preferences</h3>
            </div>

            <div
              className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100/50 hover:from-stone-100 hover:to-stone-50 cursor-pointer transition-all border border-stone-200/50 hover:border-stone-300 hover:shadow-lg group"
              onClick={() => navigate("/account/settings")}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <SettingsIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-stone-900 mb-1 group-hover:text-[var(--color-coral)] transition-colors">
                    Manage Settings
                  </h4>
                  <p className="text-sm text-stone-600">
                    Device settings, dark mode, data management, and more
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-stone-400 group-hover:text-[var(--color-coral)] group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  icon,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  icon: React.ReactNode;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-600 mb-2">{label}</label>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-hover:text-[var(--color-coral)] transition-colors">
          {icon}
        </div>

        <input
          type={type}
          defaultValue={defaultValue}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-stone-50 border-2 border-stone-200 outline-none text-stone-900 focus:border-[var(--color-coral)] focus:bg-white transition-all"
        />
      </div>
    </div>
  );
}
