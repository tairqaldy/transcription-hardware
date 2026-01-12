export type SummaryType = "custom" | "daily" | "weekly";

export type SummaryNote = {
  id: string;
  created_at: string;
  text: string | null;
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "they",
  "them",
  "then",
  "than",
  "were",
  "was",
  "are",
  "but",
  "not",
  "you",
  "your",
  "our",
  "their",
  "about",
  "into",
  "over",
  "under",
  "after",
  "before",
  "because",
  "also",
  "just",
  "can",
  "could",
  "should",
  "would",
  "will",
  "have",
  "has",
  "had",
  "been",
  "being",
  "how",
  "what",
  "when",
  "where",
  "why",
  "who",
  "which",
  "each",
  "other",
  "some",
  "more",
  "most",
  "such",
  "only",
  "very",
]);

const positiveWords = [
  "good",
  "great",
  "excellent",
  "positive",
  "success",
  "improve",
  "improved",
  "happy",
  "benefit",
  "progress",
  "win",
];

const negativeWords = [
  "bad",
  "issue",
  "problem",
  "negative",
  "risk",
  "error",
  "fail",
  "failed",
  "delay",
  "blocked",
  "concern",
];

export function buildSummaryPrompt(notes: SummaryNote[], summaryType: SummaryType): string {
  const header =
    summaryType === "daily"
      ? "Create a daily summary of the following transcription notes."
      : summaryType === "weekly"
        ? "Create a weekly summary of the following transcription notes."
        : "Summarize the following transcription notes.";

  const notesText = notes
    .map((note) => `[${note.created_at}] ${note.text ?? ""}`.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");

  return `${header}
Provide key points, main topics, and important information.

Notes:
${notesText}

Provide a concise summary with:
1. Key points (3-5 bullet points)
2. Main topics discussed
3. Important dates/times mentioned
4. Overall sentiment

Summary:`;
}

export function extractKeyPoints(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletPoints = lines
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, ""))
    .filter(Boolean);

  if (bulletPoints.length > 0) {
    return bulletPoints.slice(0, 5);
  }

  const sentences = text
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 5);
}

export function detectSentiment(text: string): "positive" | "negative" | "neutral" {
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
  let positiveScore = 0;
  let negativeScore = 0;

  for (const token of tokens) {
    if (positiveWords.includes(token)) positiveScore += 1;
    if (negativeWords.includes(token)) negativeScore += 1;
  }

  if (positiveScore > negativeScore + 1) return "positive";
  if (negativeScore > positiveScore + 1) return "negative";
  return "neutral";
}

export function extractTopics(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z']{3,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const token of tokens) {
    if (stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function getSummaryPeriod(summaryType: SummaryType): { start: Date; end: Date } | null {
  if (summaryType !== "daily" && summaryType !== "weekly") {
    return null;
  }

  const now = new Date();
  if (summaryType === "daily") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    return { start, end };
  }

  const end = new Date(now.toISOString());
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}
