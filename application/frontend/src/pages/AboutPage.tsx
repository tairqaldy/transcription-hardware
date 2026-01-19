import { motion } from "framer-motion";
import { Mic2, Zap, FileText, Sparkles, Clock, Shield, Smartphone } from "lucide-react";

export function AboutPage() {
  const steps = [
    {
      icon: Mic2,
      title: "Wear & Record",
      description:
        "Simply tap to start recording. The built-in microphones capture clear audio in any environment.",
      color: "from-[var(--color-peach)] to-[var(--color-coral)]",
      gradient: "from-[var(--color-peach)]/18 to-[var(--color-coral)]/18",
    },
    {
      icon: Zap,
      title: "Auto-Transcribe",
      description: "AI converts your voice to text with high accuracy. No manual typing required.",
      color: "from-stone-700 to-stone-800",
      gradient: "from-stone-700/18 to-stone-800/18",
    },
    {
      icon: FileText,
      title: "Organize & Search",
      description:
        "Notes are organized and searchable. Find any keyword or topic in seconds—even across many recordings.",
      color: "from-stone-600 to-stone-700",
      gradient: "from-stone-600/18 to-stone-700/18",
    },
  ];

  const features = [
    {
      icon: Clock,
      title: "Real-time Sync",
      description: "Access your notes across devices",
      color: "from-[var(--color-peach)] to-[var(--color-coral)]",
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Designed with privacy in mind",
      color: "from-stone-700 to-stone-800",
    },
    {
      icon: Sparkles,
      title: "AI-Powered",
      description: "Summaries and keyword extraction",
      color: "from-stone-600 to-stone-700",
    },
    {
      icon: Smartphone,
      title: "Works Offline",
      description: "Record anytime, sync when connected",
      color: "from-[var(--color-coral)] to-stone-700",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-neutral-50)]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-[var(--color-peach)]/18 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-stone-800/10 to-transparent rounded-full blur-3xl gradient-shift"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] text-white shadow-lg mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">About Nothing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-stone-900 mb-6 leading-tight"
          >
            Hands-free note-taking,
            <br />
            <span className="bg-gradient-to-r from-[var(--color-peach)] via-stone-700 to-stone-800 bg-clip-text text-transparent">
              powered by AI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed"
          >
            "Nothing" transforms your voice into accurate, searchable text notes—so you can focus on what matters most.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="relative group"
              >
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-full w-8 h-0.5 bg-gradient-to-r from-stone-300 to-transparent z-0" />
                )}

                <motion.div
                  className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-br from-stone-900 to-stone-700 text-white flex items-center justify-center font-bold shadow-xl z-20"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  {index + 1}
                </motion.div>

                <div className="relative bg-white rounded-3xl p-8 shadow-lg border border-stone-200/50 h-full overflow-hidden group-hover:shadow-2xl transition-all duration-500">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="relative z-10">
                    <motion.div
                      className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-xl`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Icon className="w-10 h-10 text-white" />
                    </motion.div>

                    <h3 className="text-stone-900 mb-4 group-hover:text-[var(--color-coral)] transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-stone-600 leading-relaxed">{step.description}</p>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-peach)] via-stone-700 to-stone-800 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Features */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-stone-900 mb-4">Built for your workflow</h2>
            <p className="text-stone-600 text-lg">Everything you need to capture and organize your thoughts</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="group bg-white rounded-2xl p-6 shadow-md border border-stone-200/50 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="text-stone-900 mb-2 group-hover:text-[var(--color-coral)] transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-10 py-5 rounded-2xl bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] text-white shadow-2xl font-semibold text-lg overflow-hidden group glow-on-hover"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-coral)] to-[var(--color-peach)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              Start Recording Now
              <Sparkles className="w-5 h-5" />
            </span>
          </motion.button>

          <p className="mt-6 text-stone-600">
            Ready to transform how you take notes?
          </p>
        </motion.div>
      </div>
    </div>
  );
}
