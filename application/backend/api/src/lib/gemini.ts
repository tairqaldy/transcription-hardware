import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const genAi = new GoogleGenerativeAI(config.googleAiApiKey);

export async function generateSummaryText(prompt: string): Promise<string> {
  const model = genAi.getGenerativeModel({ model: config.summaryModel });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text.trim();
}
