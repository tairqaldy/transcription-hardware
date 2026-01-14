import { useEffect, useMemo, useState } from "react";
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
  created_at: string;
  title: string | null;
  content: string | null;
  duration: string | null;
  device_id: string | null;
  user_id: string;
};

type SummaryRow = {
  id: string;
  note_id: string;
  device_id: string | null;
  user_id: string;
  content: string | null;
  summary_type: string;
};

interface Note {
  id: string;
  title: string;
  content: string; // transcript
  timestamp: Date;
  duration: string;
  deviceId: string | null;
  summary: string | null;
}

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title ?? "Untitled",
    content: row.content ?? "",
    timestamp: new Date(row.created_at),
    duration: row.duration ?? "00:00",
    deviceId: row.device_id ?? null,
    summary: null,
  };
}

/**
 * TEMP summariser so UI works before device/AI is connected.
 * Replace later with Edge Function / backend endpoint.
 */
async function summarizeWithAI(transcript: string): Promise<string> {
  const t = transcript.trim();
  if (!t) return "No transcript text available.";
  return t.slice(0, 420) + (t.length > 420 ? "…" : "");
}

export function Dashboard() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  // ✅ KEY FIX: store only the selected note ID, and always derive the note from `notes`.
  // This prevents stale selectedNote objects, and also makes the Summary button reliably show.
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = useMemo(
    () => (selectedNoteId ? notes.find((n) => n.id === selectedNoteId) ?? null : null),
    [selectedNoteId, notes]
  );

  const [noteTab, setNoteTab] = useState<"transcript" | "summary">("transcript");

  const [summarising, setSummarising] = useState(false);
  const [summariseError, setSummariseError] = useState<string | null>(null);

  const getUserId = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user?.id) throw new Error("Not authenticated");
    return data.user.id;
  };

  const loadNotes = async () => {
    setNotesError(null);
    setLoadingNotes(true);

    try {
      const userId = await getUserId();

      const { data: noteRows, error: noteErr } = await supabase
        .from("notes")
        .select("id, created_at, title, content, duration, device_id, user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (noteErr) throw new Error(noteErr.message);

      const baseNotes = (noteRows ?? []).map(rowToNote);
      const noteIds = baseNotes.map((n) => n.id);

      const summariesMap = new Map<string, string>();

      if (noteIds.length > 0) {
        const { data: sumRows, error: sumErr } = await supabase
          .from("summaries")
          .select("id, note_id, user_id, device_id, content, summary_type")
          .eq("user_id", userId)
          .in("note_id", noteIds);

        if (sumErr) throw new Error(sumErr.message);

        (sumRows ?? []).forEach((s: SummaryRow) => {
          if (s.note_id && s.content) summariesMap.set(s.note_id, s.content);
        });
      }

      setNotes(
        baseNotes.map((n) => ({
          ...n,
          summary: summariesMap.get(n.id) ?? null,
        }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load notes";
      setNotesError(msg);
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
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

  const createNoteInSupabase = async (payload: { title: string; content: string; duration: string }) => {
    const userId = await getUserId();

    const { error } = await supabase.from("notes").insert({
      user_id: userId,
      title: payload.title,
      content: payload.content,
      duration: payload.duration,
      text: payload.content, // required in your DB (NOT NULL)
      device_id: null,
    });

    if (error) throw new Error(error.message);
  };

  const handleRecordingAction = async () => {
    if (recordingState === "idle") {
      setRecordingState("recording");
      return;
    }

    if (recordingState === "recording") {
      setRecordingState("processing");

      setTimeout(async () => {
        try {
          const duration = formatDuration(recordingDuration);

          await createNoteInSupabase({
            title: "New Recording",
            content:
              "FULL TRANSCRIPT PLACEHOLDER: This will be the full transcribed text from the recording device once connected. For now, it simulates a real transcript so the UI flow (open note → view full text → summarise) works.",
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
      }, 1200);
    }
  };

  const deleteSelectedNote = async () => {
    if (!selectedNote) return;

    const { error } = await supabase.from("notes").delete().eq("id", selectedNote.id);
    if (error) {
      alert("Error deleting note: " + error.message);
      return;
    }

    setSelectedNoteId(null);
    await loadNotes();
  };

  const summariseNoteById = async (noteId: string) => {
    setSummariseError(null);
    setSummarising(true);

    try {
      const userId = await getUserId();
      const note = notes.find((n) => n.id === noteId);
      if (!note) throw new Error("Note not found");

      const summaryText = await summarizeWithAI(note.content);

      const { data: existing, error: existErr } = await supabase
        .from("summaries")
        .select("id")
        .eq("note_id", noteId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existErr) throw new Error(existErr.message);

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("summaries")
          .update({ content: summaryText, summary_type: "ai" })
          .eq("id", existing.id);

        if (updErr) throw new Error(updErr.message);
      } else {
        const { error: insErr } = await supabase.from("summaries").insert({
          note_id: noteId,
          user_id: userId,
          device_id: note.deviceId ?? null,
          content: summaryText,
          summary_type: "ai",
        });

        if (insErr) throw new Error(insErr.message);
      }

      // ✅ instant UI update (so the Summary tab + label appears immediately)
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, summary: summaryText } : n)));
      setNoteTab("summary");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Summarisation failed";
      setSummariseError(msg);
    } finally {
      setSummarising(false);
    }
  };

  const stateConfig = useMemo(() => {
    switch (recordingState) {
      case "recording":
        return {
          icon: Square,
          label: "Stop Recording",
          color: "from-[var(--color-peach)] to-[var(--color-coral)]",
          message: "Recording in progress...",
          subMessage: "Your device is capturing audio",
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
          subMessage: "Please try again",
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
  const hasSummary = !!selectedNote?.summary?.trim();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-neutral-50)]">
      {/* Background blobs */}
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

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)] rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">{notes.length}</div>
            <div className="text-sm text-stone-600">Total Notes</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="w-5 h-5 text-[var(--color-coral)]" />
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">2.4h</div>
            <div className="text-sm text-stone-600">This Week</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 font-medium">Active</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">87%</div>
            <div className="text-sm text-stone-600">Battery</div>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-stone-200/50">
              <div className="flex flex-col items-center text-center">
                <h2 className="text-stone-900 mb-2">{stateConfig.message}</h2>
                <p className="text-stone-600 mb-6">{stateConfig.subMessage}</p>

                <motion.button
                  onClick={handleRecordingAction}
                  disabled={recordingState === "processing" || recordingState === "complete"}
                  className={[
                    "relative w-32 h-32 sm:w-44 sm:h-44 rounded-full",
                    `bg-gradient-to-br ${stateConfig.color}`,
                    "text-white shadow-2xl transition-all duration-300",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                  ].join(" ")}
                  whileHover={recordingState === "idle" ? { scale: 1.05 } : {}}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
                  <StateIcon
                    className={[
                      "w-14 h-14 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                      recordingState === "processing" ? "animate-spin" : "",
                    ].join(" ")}
                  />
                </motion.button>

                {recordingState === "recording" && (
                  <div className="mt-6 text-stone-700 font-mono text-2xl">
                    {formatDuration(recordingDuration)}
                  </div>
                )}

                <div className="mt-6 text-stone-600 font-medium">{stateConfig.label}</div>
              </div>
            </div>

            {/* Device status */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 shadow-xl text-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white">Device Status</h3>
                <div className="flex items-center gap-2 text-sm bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Connected</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <Battery className="w-6 h-6 text-emerald-400 mb-3" />
                  <div className="text-2xl font-bold mb-1">87%</div>
                  <div className="text-xs text-white/70">Battery</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <Bluetooth className="w-6 h-6 text-blue-400 mb-3" />
                  <div className="text-2xl font-bold mb-1">5.2</div>
                  <div className="text-xs text-white/70">Bluetooth</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <FileText className="w-6 h-6 text-[var(--color-coral)] mb-3" />
                  <div className="text-2xl font-bold mb-1">{notes.length}</div>
                  <div className="text-xs text-white/70">Notes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent notes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-stone-200/50 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-stone-900">Recent Notes</h3>
                <div className="px-3 py-1 bg-gradient-to-r from-[var(--color-peach)]/10 to-[var(--color-coral)]/10 rounded-full">
                  <span className="text-sm font-medium text-[var(--color-coral)]">{notes.length}</span>
                </div>
              </div>

              {loadingNotes && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading notes...
                </div>
              )}

              {notesError && !loadingNotes && <div className="text-sm text-red-600">{notesError}</div>}

              {!loadingNotes && !notesError && (
                <>
                  <div className="space-y-3">
                    {notes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-stone-50 hover:bg-stone-100 transition border border-stone-200"
                      >
                        <button
                          onClick={() => {
                            setSelectedNoteId(note.id);
                            setNoteTab(note.summary ? "summary" : "transcript");
                            setSummariseError(null);
                          }}
                          className="w-full text-left group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-stone-900 line-clamp-1 group-hover:text-[var(--color-coral)] transition-colors">
                              {note.title}
                            </h4>
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[var(--color-coral)] transition-all flex-shrink-0" />
                          </div>

                          <p className="text-sm text-stone-600 line-clamp-2 mb-3">
                            {note.summary?.trim() ? note.summary : note.content}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-stone-500">
                            <span className="font-mono bg-stone-200/50 px-2 py-0.5 rounded">{note.duration}</span>
                            <span>•</span>
                            <span>{note.timestamp.toLocaleDateString()}</span>
                            {note.summary && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 font-medium">Summarised</span>
                              </>
                            )}
                          </div>
                        </button>

                        {/* ✅ Optional: a tiny summary button right on the card (always shows) */}
                        <div className="mt-3">
                          <button
                            onClick={() => void summariseNoteById(note.id)}
                            disabled={summarising || !note.content.trim()}
                            className="w-full py-2 px-3 rounded-lg bg-white border border-stone-200 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
                          >
                            {summarising ? "Summarising…" : note.summary?.trim() ? "Re-summarise" : "Summarise"}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {notes.length === 0 && (
                    <div className="text-center py-10 text-stone-500">
                      <p className="font-medium">No notes yet</p>
                      <p className="text-xs">Start recording to create your first note</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setSelectedNoteId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white rounded-3xl p-5 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-stone-900 mb-2 truncate">{selectedNote.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                    <span className="font-mono bg-stone-100 px-3 py-1 rounded-full">{selectedNote.duration}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{selectedNote.timestamp.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNoteId(null)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-stone-600" />
                </button>
              </div>

              {/* ✅ Tabs always show */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setNoteTab("transcript")}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-medium transition",
                    noteTab === "transcript"
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                  ].join(" ")}
                >
                  Transcript
                </button>

                <button
                  onClick={() => setNoteTab("summary")}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-medium transition",
                    noteTab === "summary" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                  ].join(" ")}
                >
                  Summary
                </button>
              </div>

              {noteTab === "transcript" && (
                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>
              )}

              {noteTab === "summary" && (
                <div className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNote.summary?.trim() ? (
                    selectedNote.summary
                  ) : (
                    <div className="text-stone-500">
                      No summary yet. Click <span className="font-medium text-stone-900">Summarise</span> to generate one.
                    </div>
                  )}
                </div>
              )}

              {/* ✅ Summary button always shows (not conditional) */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => void summariseNoteById(selectedNote.id)}
                  disabled={summarising || !selectedNote.content.trim()}
                  className="sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] text-white font-medium disabled:opacity-60"
                >
                  {summarising ? "Summarising…" : hasSummary ? "Re-summarise" : "Summarise"}
                </button>

                <button
                  onClick={() => void deleteSelectedNote()}
                  className="py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all"
                >
                  Delete
                </button>
              </div>

              {summariseError && <div className="mt-3 text-sm text-red-600">{summariseError}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
