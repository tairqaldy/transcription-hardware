import { Router } from "express";
import { config } from "../config.js";
import { generateSummaryText } from "../lib/gemini.js";
import { supabaseAdmin } from "../lib/supabase.js";
import {
  buildSummaryPrompt,
  detectSentiment,
  extractKeyPoints,
  extractTopics,
  getSummaryPeriod,
  type SummaryNote,
  type SummaryType,
} from "../utils/summary.js";

type ParseResult =
  | { ok: true; value: { noteIds: string[]; summaryType: SummaryType; userId: string } }
  | { ok: false; error: string };

const allowedSummaryTypes: SummaryType[] = ["custom", "daily", "weekly"];

const parseSummarizeRequest = (body: unknown): ParseResult => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body" };
  }

  const record = body as { note_ids?: unknown; summary_type?: unknown; user_id?: unknown };

  const noteIdsRaw = Array.isArray(record.note_ids) ? record.note_ids : null;
  if (!noteIdsRaw) {
    return { ok: false, error: "note_ids must be an array of strings" };
  }

  const noteIds = [...new Set(
    noteIdsRaw
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  )];

  if (noteIds.length === 0) {
    return { ok: false, error: "note_ids cannot be empty" };
  }

  const userId = typeof record.user_id === "string" ? record.user_id.trim() : "";
  if (!userId) {
    return { ok: false, error: "user_id is required" };
  }

  const summaryTypeRaw = typeof record.summary_type === "string" ? record.summary_type.trim() : "custom";
  if (!allowedSummaryTypes.includes(summaryTypeRaw as SummaryType)) {
    return { ok: false, error: "summary_type must be one of custom, daily, weekly" };
  }

  return {
    ok: true,
    value: {
      noteIds,
      summaryType: summaryTypeRaw as SummaryType,
      userId,
    },
  };
};

const getBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

export const summarizeRouter = Router();

summarizeRouter.post("/summarize", async (req, res) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Missing bearer token" });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const parsed = parseSummarizeRequest(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.error });
    }

    const { noteIds, summaryType, userId } = parsed.value;
    if (authData.user.id !== userId) {
      return res.status(403).json({ message: "User does not match token" });
    }

    const { data: notes, error: notesError } = await supabaseAdmin
      .from("notes")
      .select("*")
      .in("id", noteIds)
      .eq("user_id", userId);

    if (notesError) {
      console.error("Failed to load notes", notesError);
      return res.status(500).json({ message: "Failed to load notes" });
    }

    const foundIds = new Set((notes ?? []).map((note) => note.id));
    const missing = noteIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return res.status(404).json({
        message: "Note not found or access denied",
        missing_note_ids: missing,
      });
    }

    const normalizedNotes: SummaryNote[] = (notes ?? []).map((note) => {
      const typed = note as {
        id: string;
        created_at: string;
        text?: string | null;
        content?: string | null;
      };
      return {
        id: typed.id,
        created_at: typed.created_at,
        text: typeof typed.text === "string" && typed.text.trim().length > 0
          ? typed.text
          : typeof typed.content === "string"
            ? typed.content
            : null,
      };
    });

    const validNotes = normalizedNotes.filter((note) => {
      return typeof note.text === "string" && note.text.trim().length > 0;
    });

    if (validNotes.length === 0) {
      return res.status(400).json({ message: "No transcribed notes to summarize" });
    }

    const prompt = buildSummaryPrompt(validNotes, summaryType);
    const summaryText = await generateSummaryText(prompt);
    const keyPoints = extractKeyPoints(summaryText);
    const sentiment = detectSentiment(summaryText);
    const topics = extractTopics(validNotes.map((note) => note.text ?? "").join("\n\n"));

    const summaryRecord: Record<string, unknown> = {
      user_id: userId,
      summary_type: summaryType,
      title: `Summary - ${validNotes.length} notes`,
      content: summaryText,
      summary_model: config.summaryModel,
      note_count: validNotes.length,
      key_points: keyPoints,
      sentiment,
      topics,
    };

    const period = getSummaryPeriod(summaryType);
    if (period) {
      summaryRecord.period_start = period.start.toISOString();
      summaryRecord.period_end = period.end.toISOString();
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("summaries")
      .insert(summaryRecord)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save summary", insertError);
      return res.status(500).json({ message: "Failed to save summary" });
    }

    return res.status(200).json({
      summary_id: inserted?.id ?? null,
      message: "Summary created successfully",
    });
  } catch (error) {
    console.error("Unhandled summarize error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
