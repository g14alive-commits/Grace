import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { messages, userName, isAbrupt } = await req.json();

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
          content: isAbrupt ? 
`This session ended mid-conversation — the user ran out of time. Return ONLY valid JSON, no markdown.

${allMessages}

Return this exact JSON:
{
  "summary": "2-3 sentences only. What they came with and what was unresolved or resolved.",
  "themes": ["theme1"],
  "key_words": ["significant phrase the user said"],
  "headline": "3-4 words max, self-focused",
  "closing_message": "One warm sentence acknowledging what issue they came up with, what went through the session and inviting them to pick it up next time. Under 50 words."
}`
:
`Read this therapy session and extract key information. Return ONLY valid JSON, no markdown. Never use clinical words like "nervous system", "dysregulated", "attachment", "anxious", "avoidant". Use plain human language.
${allMessages}
Return this exact JSON:
{
  "summary": "Use this exact format:\nIssue: [one-two line on what they came with]\nGrowth signals: [any positive shifts detected, or 'none']\nAction agreed: [the one thing they committed to, or 'none']\nTone shift: [yes / partial / no]\nRelationship facts added: [any new facts about their relationship extracted, or 'none']",
"pattern": "reaches harder / steps back / balanced — detect from conversation. This is for internal DB only, never display to user.",
  "themes": ["theme1", "theme2"],
  "key_words": ["significant phrase the user said"],
  "action_taken": "action or insight Grace anchored at the close",
  "growth_signals": ["any positive shifts detected"],
  "headline": "2-3 words maximum. A chapter-heading style title, self-focused. Examples: 'Why I go quiet', 'Underneath the anger', 'Choosing to stay', 'First time I didn't run'. Never more than 4 words. Never mention the partner by name.",
  
"closing_message": "A warm closing message from Grace. Follow this structure exactly — no more: (1) One plain sentence on why they came today.\n (2)key insight from the session — only include if there was a genuinely meaningful one, skip it entirely if not.\n (3) The action or decision they made. End with one warm human line. Address them by name if provided: ${userName || ""}. No clinical language. No lists. No bullet points. Under 80 words total. Should feel like a real person closing a real conversation."
}`,
        },
      ],
    });

  const raw =
  response.content[0].type === "text"
    ? response.content[0].text.trim()
    : "{}";

try {
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const lastTen = messages.slice(-10);
  const { pattern, ...publicData } = parsed;
  return Response.json({ ...publicData, last_ten_messages: lastTen });
} catch (e) {
  console.error("Failed to parse session JSON:", raw);
  return Response.json({
    summary: "",
    themes: [],
    key_words: [],
    action_taken: "",
    growth_signals: [],
    headline: "",
    closing_message: "Something went wrong closing this session. Your conversation is saved.",
    last_ten_messages: messages.slice(-10),
  });
}

} catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}