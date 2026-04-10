export async function rewriteForUser(message, senderName, recipientProfile, senderTag) {
  if (!recipientProfile) return message;
  const signAs = senderTag || senderName;
  const toneMap = { casual: "casual and friendly", direct: "clear and direct, no fluff", gentle: "warm, soft, and considerate", humorous: "light-hearted with a touch of humor" };
  const askMap = { direct: "direct requests", suggestion: "gentle suggestions", question: "polite questions" };
  const sensMap = { low: "not sensitive at all", medium: "moderately sensitive", high: "very sensitive — be extra gentle" };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `You rewrite household messages to match the recipient's communication style. Return ONLY the rewritten message text, nothing else.

CRITICAL RULES:
- ALWAYS use positive reinforcement. Never shame, blame, or guilt.
- If the original message has any negative framing, rewrite it as an opportunity or encouragement.
- Never say "you forgot" or "you didn't" — instead frame as "here's a chance to" or "when you get a moment"
- Keep the core meaning intact. Don't lose important details like dates, names, or specifics.
- Keep it concise — similar length to the original.
- Sign the message as "— ${signAs}" at the end. Use "${signAs}" as the sender's name/title throughout.

Recipient's preferences:
- Tone: ${toneMap[recipientProfile.tone] || "casual and friendly"}
- Prefers to be asked via: ${askMap[recipientProfile.askStyle] || "direct requests"}
- Sensitivity to asks: ${sensMap[recipientProfile.sensitivity] || "moderate"}
- Sender identifies as: ${signAs}`,
        messages: [{ role: "user", content: `Rewrite this message: "${message}"` }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || message;
  } catch {
    return message;
  }
}
