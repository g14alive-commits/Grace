import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { messages, userName } = await req.json();

    const allMessages = messages
      .map((m: string) => {
        if (m.startsWith("You: ")) return `User: ${m.replace("You: ", "")}`;
        return `Grace: ${m.replace("Grace: ", "")}`;
      })
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Read this therapy session and extract key information. Return ONLY valid JSON, no markdown.

${allMessages}

Return this exact JSON:
{
  "summary": "2-3 sentence summary of what was covered and where the person landed",
  "themes": ["theme1", "theme2"],
  "key_words": ["significant phrase the user said"],
  "action_taken": "the one action or insight Grace anchored at the close",
  "growth_signals": ["any positive shifts detected"],
  "closing_message": "A warm closing message from Grace. Follow this structure exactly — no more: (1) One plain sentence on why they came today. (2) One key insight from the session — only include if there was a genuinely meaningful one, skip it entirely if not. (3) The one action or decision they made. End with one warm human line. Address them by name if provided: ${userName || ""}. No clinical language. No lists. No bullet points. Under 80 words total. Should feel like a real person closing a real conversation."
}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return Response.json(parsed);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}