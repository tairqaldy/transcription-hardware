import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Zap,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Users,
  Shield,
  ChevronRight,
  Play,
} from "lucide-react";

const PEACH = "#FF9B7F";
const CORAL = "#FF8A6D";

export function Home() {
  const navigate = useNavigate();

  const features = useMemo(
    () => [
      {
        icon: Mic,
        title: "Crystal Clear Audio",
        description:
          "Professional-grade microphones capture every word with stunning clarity.",
      },
      {
        icon: Zap,
        title: "Instant Transcription",
        description:
          "AI-powered transcription converts speech to text in real time.",
      },
      {
        icon: FileText,
        title: "Smart Organization",
        description:
          "Automatically organize and search through all your notes instantly.",
      },
      {
        icon: Shield,
        title: "Private & Secure",
        description:
          "End-to-end encryption keeps your conversations confidential.",
      },
    ],
    []
  );

  const testimonials = useMemo(
    () => [
      {
        name: "Sarah Chen",
        content:
          "NoteNecklace changed how I study. I focus on understanding lectures instead of writing nonstop.",
        rating: 5,
      },
      {
        name: "Marcus Johnson",
        content:
          "A game-changer for meetings. I never miss action items anymore.",
        rating: 5,
      },
      {
        name: "Emma Rodriguez",

        content:
          "The accuracy is incredible. I get perfect quotes every time.",
        rating: 5,
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { value: "50K+", label: "Active Users" },
      { value: "98%", label: "Accuracy Rate" },
      { value: "1M+", label: "Notes Captured" },
      { value: "4.9/5", label: "User Rating" },
    ],
    []
  );

  const gradient = {
    backgroundImage: `linear-gradient(90deg, ${PEACH}, ${CORAL})`,
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] relative overflow-hidden">
      {/* Background blobs */}
      <motion.div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,155,127,.35), rgba(255,138,109,.08), transparent)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10">
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border"
              style={{
                borderColor: "rgba(255,138,109,.3)",
                background:
                  "linear-gradient(90deg, rgba(255,155,127,.15), rgba(255,138,109,.12))",
              }}
            >
              <Sparkles size={16} color={CORAL} />
              <span className="text-sm font-semibold text-stone-700">
                Trusted by 50,000+ users
              </span>
            </div>

            <h1 className="text-6xl font-bold text-stone-900 mb-6 leading-tight">
              Never miss a{" "}
              <span
                className="bg-clip-text text-transparent"
                style={gradient}
              >
                word
              </span>{" "}
              again
            </h1>

            <p className="text-xl text-stone-600 mb-10">
              Hands-free recording meets AI transcription for effortless
              note-taking.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/dashboard")}
                className="px-8 py-4 rounded-xl text-white font-semibold shadow-xl flex items-center gap-2"
                style={gradient}
              >
                Get Started
                <ArrowRight size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/about")}
                className="px-8 py-4 rounded-xl bg-white border-2 border-stone-300 font-semibold flex items-center gap-2"
              >
                <Play size={18} />
                How it works
              </motion.button>
            </div>

            <div className="flex gap-6 text-sm text-stone-600">
              <span className="flex items-center gap-2">
                <Check className="text-emerald-600" size={16} />
                No credit card
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-emerald-600" size={16} />
                14-day trial
              </span>
            </div>
          </motion.div>

          {/* VISUAL CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-10 shadow-2xl text-white"
          >
            <div className="bg-white/10 rounded-2xl p-6 mb-6">
              <div className="flex justify-between mb-4">
                <span className="text-sm opacity-70">Recording</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>

              <div className="flex gap-1 h-16 items-end mb-4">
                {[...Array(18)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={gradient}
                    animate={{ height: ["20%", "100%", "30%"] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>

              <div className="text-center font-mono text-3xl">12:34</div>
            </div>

            <div className="bg-white/10 rounded-2xl p-5">
              <h4 className="font-semibold mb-1">Latest Note</h4>
              <p className="text-sm opacity-80">
                Your transcribed notes appear here instantly.
              </p>
            </div>
          </motion.div>
        </section>

        {/* STATS */}
        <section className="bg-gradient-to-br from-stone-900 to-stone-800 py-16">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
                <div className="text-4xl font-bold text-white">{s.value}</div>
                <div className="text-stone-400">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-2xl p-8 shadow-md border"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={gradient}
                  >
                    <Icon className="text-white" />
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-stone-600 text-sm">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-md border">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={18} color={CORAL} fill={CORAL} />
                  ))}
                </div>
                <p className="text-stone-700 mb-6">“{t.content}”</p>
                <div className="flex gap-3 items-center">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-stone-900 to-stone-800 py-24 text-center text-white">
          <h2 className="text-5xl font-bold mb-6">
            Ready to transform how you take notes?
          </h2>
          <p className="text-stone-300 mb-10">
            Start your free trial today.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate("/dashboard")}
            className="px-10 py-5 rounded-xl font-semibold shadow-xl"
            style={gradient}
          >
            Start Free Trial
          </motion.button>
        </section>
      </div>
    </div>
  );
}
