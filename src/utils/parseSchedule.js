export async function parseCustomSchedule(description) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You parse natural language schedule descriptions into structured JSON. Return ONLY valid JSON with no markdown or backticks. Format:
{"summary":"short human-readable summary","intervalDays":number_or_null,"startDate":"YYYY-MM-DD_or_null","weeklyDays":[0-6]_or_null,"monthlyDays":[1-31]_or_null,"frequency":"custom"}
If you can't parse it, return: {"summary":"Custom schedule","intervalDays":null,"startDate":null,"weeklyDays":null,"monthlyDays":null,"frequency":"custom"}`,
        messages: [{ role: "user", content: description }],
      }),
    });
    const data = await response.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { summary: "Custom schedule", intervalDays: null, startDate: null, weeklyDays: null, monthlyDays: null, frequency: "custom" };
  }
}
