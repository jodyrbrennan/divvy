/**
 * communication.js — AI Communication Engine using local Ollama.
 *
 * This rewrites messages to match the recipient's communication profile.
 * It calls your local Ollama (running on your home network) instead of
 * a cloud API, so no internet is needed and there are no costs.
 *
 * If Ollama is not running or AI is disabled, the original message is
 * returned unchanged — the app still works, just without tone adaptation.
 */

import { askOllama, AI_ENABLED } from "./aiConfig";

/**
 * Rewrite a message to match the recipient's communication preferences.
 *
 * @param {string} message          — The original message text
 * @param {string} senderName       — Name of the person sending the message
 * @param {object} recipientProfile — The recipient's communication profile
 * @param {string} senderTag        — How the sender wants to sign off (e.g. "Dad", "Mom")
 * @returns {string} The rewritten message, or the original if AI is unavailable
 */
export async function rewriteForUser(message, senderName, recipientProfile, senderTag) {
  // If AI is turned off or no profile exists, return the original message
  if (!AI_ENABLED || !recipientProfile) return message;

  // Build a description of the recipient's preferences for the AI
  const profile = recipientProfile;
  const profileDescription = [
    profile.tone && `Preferred tone: ${profile.tone}`,
    profile.sensitivity && `Sensitivity to task asks: ${profile.sensitivity}`,
    profile.forgetfulness && `Forgetfulness self-assessment: ${profile.forgetfulness}`,
    profile.taskFeelings && `Feelings about undone tasks: ${profile.taskFeelings}`,
    profile.askStyle && `Preferred ask style: ${profile.askStyle}`,
    profile.recognitionPref && `Recognition preference: ${profile.recognitionPref}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are a message rewriting assistant for a household app called Divvy. Your job is to rewrite messages so they match the recipient's communication preferences while keeping the meaning intact.

RULES — follow these strictly:
- Always use positive reinforcement. Never shame, blame, or guilt.
- Never say "you forgot" or "you didn't". Instead use phrases like "here's a chance to" or "when you get a moment".
- Match the recipient's preferred tone exactly.
- Match the recipient's preferred ask style exactly.
- Be mindful of the recipient's sensitivity level.
- Keep the core meaning intact. Preserve all dates, names, times, and specific details.
- Keep the message concise — similar length to the original.
- Sign the message with: — ${senderTag || senderName}
- Return ONLY the rewritten message. No explanations, no quotes, no extra text.

RECIPIENT'S COMMUNICATION PROFILE:
${profileDescription || "No specific preferences set — use a warm, friendly tone."}`;

  const result = await askOllama(systemPrompt, `Rewrite this message: "${message}"`);

  // If Ollama returned something, use it. Otherwise fall back to the original.
  if (result && result.trim()) {
    // Clean up: remove surrounding quotes if the AI added them
    let cleaned = result.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  }

  return message;
}
