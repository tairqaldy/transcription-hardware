import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Battery,
  Bluetooth,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Zap,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type RecordingState = "idle" | "recording" | "processing" | "complete" | "error";

type NoteRow = {
  id: string;
  created_at: string; // timestamptz
  title: string | null;
  content: string | null;
  duration: string | null;
};

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  duration: string;
}

type DashboardProps = {
  apiBaseUrl?: string;
};

type TranscriptionResult = {
  text: string;
  language?: string;
  duration_seconds?: number;
};


function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title ?? "Untitled",
    content: row.content ?? "",
    timestamp: new Date(row.created_at),
    duration: row.duration ?? "00:00",
  };
}

export function Dashboard({ apiBaseUrl }: DashboardProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const aiApiBaseUrl = apiBaseUrl ?? import.meta.env.VITE_AI_API_URL ?? "http://localhost:8000";

  // Fetch notes
  const loadNotes = async () => {
    setNotesError(null);
    setLoadingNotes(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error(userError);
      setNotesError(userError.message);
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    if (!userData.user) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .select("id, created_at, title, content, duration")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setNotesError(error.message);
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    setNotes((data ?? []).map(rowToNote));
    setLoadingNotes(false);
  };


  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (recordingState === "recording") {
      interval = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingState]);

  const startBackendRecording = async () => {
    const response = await fetch(`${aiApiBaseUrl}/record/start`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof payload.error === "string" ? payload.error : "Failed to start recording";
      throw new Error(message);
    }
  };

  const stopBackendRecording = async (): Promise<TranscriptionResult> => {
    const response = await fetch(`${aiApiBaseUrl}/record/stop`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof payload.error === "string" ? payload.error : "Failed to stop recording";
      throw new Error(message);
    }

    return {
      text: typeof payload.text === "string" ? payload.text : "",
      language: typeof payload.language === "string" ? payload.language : undefined,
      duration_seconds: typeof payload.duration_seconds === "number" ? payload.duration_seconds : undefined,
    };
  };

  const createNoteInSupabase = async (payload: { title: string; content: string; duration: string }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error(userError);
      throw new Error(userError.message);
    }

    if (!userData.user) {
      throw new Error("You must be logged in to save notes.");
    }

    const { error } = await supabase.from("notes").insert({
      user_id: userData.user.id,
      title: payload.title,
      content: payload.content,
      duration: payload.duration,
      text: payload.content,
    });

    if (error) {
      console.error(error);
      throw new Error(error.message);
    }
  };


  const handleRecordingAction = async () => {
    if (recordingState === "idle") {
      try {
        await startBackendRecording();
        setRecordingState("recording");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to start recording";
        alert("Error: " + msg);
        setRecordingState("error");
        setTimeout(() => setRecordingState("idle"), 2000);
      }
      return;
    }

    if (recordingState === "recording") {
      setRecordingState("processing");
      const durationSeconds = recordingDuration;

      try {
        const transcription = await stopBackendRecording();
        const transcriptText = transcription.text.trim();
        const title = transcriptText
          ? transcriptText.split(/\s+/).slice(0, 6).join(" ")
          : "New Recording";
        const duration = formatDuration(transcription.duration_seconds ?? durationSeconds);

        await createNoteInSupabase({
          title,
          content: transcriptText || "Transcription was empty.",
          duration,
        });

        setRecordingState("complete");
        await loadNotes();

        setTimeout(() => setRecordingState("idle"), 2000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save note";
        alert("Error: " + msg);
        setRecordingState("error");
        setTimeout(() => setRecordingState("idle"), 2000);
      }
    }
  };


  const deleteSelectedNote = async () => {
    if (!selectedNote) return;

    const id = selectedNote.id;
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Error deleting note: " + error.message);
      return;
    }

    setSelectedNote(null);
    await loadNotes();
  };

  const stateConfig = useMemo(() => {
    switch (recordingState) {
      case "recording":
        return {
          icon: Square,
          label: "Stop Recording",
          color: "from-[var(--color-peach)] to-[var(--color-coral)]",
          message: "Recording in progress...",
          subMessage: "Your NoteNecklace is capturing audio",
        };
      case "processing":
        return {
          icon: Loader2,
          label: "Processing",
          color: "from-stone-600 to-stone-700",
          message: "Processing your recording...",
          subMessage: "Converting speech to text",
        };
      case "complete":
        return {
          icon: CheckCircle2,
          label: "Complete",
          color: "from-emerald-500 to-green-600",
          message: "Note saved successfully!",
          subMessage: "Your recording has been saved",
        };
      case "error":
        return {
          icon: AlertCircle,
          label: "Error",
          color: "from-red-400 to-red-500",
          message: "Something went wrong",
          subMessage: "Please try recording again",
        };
      default:
        return {
          icon: Mic,
          label: "Start Recording",
          color: "from-[var(--color-peach)] to-[var(--color-coral)]",
          message: "Ready to record",
          subMessage: "Tap the button to start capturing audio",
        };
    }
  }, [recordingState]);

  const StateIcon = stateConfig.icon;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-neutral-50)]">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[var(--color-peach)]/20 to-[var(--color-coral)]/10 rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-stone-900/10 to-stone-700/5 rounded-full blur-3xl gradient-shift"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-6 shadow-md border border-stone-200/50 hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">{notes.length}</div>
            <div className="text-sm text-stone-600">Total Notes</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-6 shadow-md border border-stone-200/50 hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="w-5 h-5 text-[var(--color-coral)]" />
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">2.4h</div>
            <div className="text-sm text-stone-600">This Week</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-6 shadow-md border border-stone-200/50 hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 font-medium">Active</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">87%</div>
            <div className="text-sm text-stone-600">Battery</div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Recording Area */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="relative bg-gradient-to-br from-white via-white to-stone-50/50 rounded-3xl p-12 sm:p-16 shadow-2xl border border-stone-200/50 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-30">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>

              {recordingState === "recording" && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[var(--color-peach)]/12 to-[var(--color-coral)]/8"
                  animate={{ opacity: [0.25, 0.6, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              <div className="flex flex-col items-center text-center relative z-10">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8">
                  <h2 className="text-stone-900 mb-3 bg-gradient-to-r from-stone-900 to-stone-700 bg-clip-text text-transparent">
                    {stateConfig.message}
                  </h2>
                  <p className="text-stone-600 text-lg">{stateConfig.subMessage}</p>
                </motion.div>

                <motion.button
                  onClick={handleRecordingAction}
                  disabled={recordingState === "processing" || recordingState === "complete"}
                  className={[
                    "relative w-40 h-40 sm:w-48 sm:h-48 rounded-full",
                    `bg-gradient-to-br ${stateConfig.color}`,
                    "text-white shadow-2xl transition-all duration-300",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    recordingState === "recording" ? "recording-glow" : "glow-on-hover",
                    recordingState === "processing" ? "subtle-pulse" : "",
                    recordingState === "idle" ? "hover:scale-105" : "",
                  ].join(" ")}
                  whileHover={recordingState === "idle" ? { scale: 1.05 } : {}}
                  whileTap={{ scale: 0.95 }}
                >
                  {recordingState === "recording" && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-white/30"
                        animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-white/30"
                        animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                    </>
                  )}

                  <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
                  <StateIcon
                    className={[
                      "w-16 h-16 sm:w-20 sm:h-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                      recordingState === "processing" ? "animate-spin" : "",
                    ].join(" ")}
                  />
                </motion.button>

                {recordingState === "recording" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                    <div className="flex items-center gap-4 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-gradient-to-t from-[var(--color-coral)] to-[var(--color-peach)] rounded-full"
                          style={{ height: "40px" }}
                          animate={{ scaleY: [0.3, 1, 0.5, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-stone-700 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-3xl font-mono font-bold tabular-nums">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  className="mt-8 text-stone-600 font-medium text-lg"
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {stateConfig.label}
                </motion.div>
              </div>
            </motion.div>

            {/* Device Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 shadow-xl text-white overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-peach)]/20 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white">Device Status</h3>
                  <div className="flex items-center gap-2 text-sm bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 font-medium">Connected</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                    <Battery className="w-6 h-6 text-emerald-400 mb-3" />
                    <div className="text-2xl font-bold mb-1">87%</div>
                    <div className="text-xs text-white/70">Battery</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                    <Bluetooth className="w-6 h-6 text-blue-400 mb-3" />
                    <div className="text-2xl font-bold mb-1">5.2</div>
                    <div className="text-xs text-white/70">Bluetooth</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                    <FileText className="w-6 h-6 text-[var(--color-coral)] mb-3" />
                    <div className="text-2xl font-bold mb-1">{notes.length}</div>
                    <div className="text-xs text-white/70">Notes</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Notes Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl p-6 shadow-xl border border-stone-200/50 sticky top-24"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-stone-900">Recent Notes</h3>
                <div className="px-3 py-1 bg-gradient-to-r from-[var(--color-peach)]/10 to-[var(--color-coral)]/10 rounded-full">
                  <span className="text-sm font-medium text-[var(--color-coral)]">{notes.length}</span>
                </div>
              </div>

              {/* Loading / Error */}
              {loadingNotes && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading notes...
                </div>
              )}

              {notesError && !loadingNotes && (
                <div className="text-sm text-red-600">
                  Could not load notes: {notesError}
                </div>
              )}

              {!loadingNotes && !notesError && (
                <>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {notes.map((note, index) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.06 }}
                          onClick={() => setSelectedNote(note)}
                          className="group p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100/50 hover:from-stone-100 hover:to-stone-50 cursor-pointer transition-all border border-stone-200/50 hover:border-stone-300 hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-stone-900 line-clamp-1 group-hover:text-[var(--color-coral)] transition-colors">
                              {note.title}
                            </h4>
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[var(--color-coral)] group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>

                          <p className="text-sm text-stone-600 line-clamp-2 mb-3">{note.content}</p>

                          <div className="flex items-center gap-3 text-xs text-stone-500">
                            <span className="font-mono bg-stone-200/50 px-2 py-0.5 rounded">{note.duration}</span>
                            <span>•</span>
                            <span>{note.timestamp.toLocaleDateString()}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {notes.length === 0 && (
                    <div className="text-center py-12 text-stone-500">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center float-animation">
                        <FileText className="w-10 h-10 text-stone-400" />
                      </div>
                      <p className="font-medium mb-1">No notes yet</p>
                      <p className="text-xs">Start recording to create your first note</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-stone-900 mb-2">{selectedNote.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <span className="font-mono bg-stone-100 px-3 py-1 rounded-full">{selectedNote.duration}</span>
                    <span>•</span>
                    <span>{selectedNote.timestamp.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-stone-600" />
                </button>
              </div>

              <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>

              <div className="mt-8 flex gap-3">
                <button className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] text-white font-medium glow-on-hover">
                  Edit Note
                </button>
                <button className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all">
                  Share
                </button>
                <button
                  onClick={deleteSelectedNote}
                  className="py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
