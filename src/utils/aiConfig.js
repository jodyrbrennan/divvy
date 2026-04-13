/**
 * aiConfig.js — Central configuration for the local AI (Ollama).
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  HOW TO SET UP:                                                 │
 * │                                                                 │
 * │  1. Install Ollama (https://ollama.com)                        │
 * │  2. Run: ollama pull llama3.1:8b                               │
 * │  3. Set OLLAMA_HOST environment variable to 0.0.0.0            │
 * │  4. Replace the IP address below with YOUR PC's local IP       │
 * │     (run 'ipconfig' in Command Prompt → look for IPv4 Address) │
 * │                                                                 │
 * │  When running on the SAME computer as Ollama, you can use:     │
 * │     http://localhost:11434                                      │
 * │                                                                 │
 * │  When running from a PHONE or other device on your Wi-Fi:      │
 * │     http://192.168.x.x:11434  (your PC's local IP)            │
 * └─────────────────────────────────────────────────────────────────┘
 */

// ─── CHANGE THIS to your PC's local IP address ───
// Find it by opening Command Prompt and typing: ipconfig
// Look for "IPv4 Address" — it will look like 192.168.1.105
const OLLAMA_IP = "192.168.4.35";

// ─── You can change the model name if you download a different one ───
// Popular options: "llama3.1:8b", "mistral", "gemma2:9b", "phi3"
const MODEL_NAME = "llama3.1:8b";

// ─── Toggle AI on/off (set to false to disable all AI features) ───
export const AI_ENABLED = true;

// ─── Full URL for the Ollama API ───
export const OLLAMA_URL = `http://${OLLAMA_IP}:11434`;

// ─── The model to use for all AI calls ───
export const OLLAMA_MODEL = MODEL_NAME;

/**
 * Helper: Send a chat request to your local Ollama and get back the response text.
 *
 * This is the single function the rest of the app calls whenever it needs AI.
 * It talks to Ollama's OpenAI-compatible endpoint so the format is standard.
 *
 * @param {string} systemPrompt — Instructions telling the AI how to behave
 * @param {string} userMessage  — The actual message/question from the user
 * @returns {string} The AI's response text, or null if something went wrong
 */
export async function askOllama(systemPrompt, userMessage) {
  if (!AI_ENABLED) return null;

  try {
    const response = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("Ollama error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    // OpenAI-compatible format: data.choices[0].message.content
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Could not reach Ollama. Is it running?", error);
    return null;
  }
}
