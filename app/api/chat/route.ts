import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "./system-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { messages, userProfile, sessionNumber } = await req.json();

    // Ignore keep-alive pings silently
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content === "__ping__") {
      return Response.json({ result: null });
    }

    const memoryBlock = buildMemoryBlock(userProfile, sessionNumber);
    const fullPrompt = systemPrompt + (memoryBlock ? "\n\n" + memoryBlock : "");

    const MAX_MESSAGES = 20;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    // Main Grace response
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: fullPrompt,
          cache_control: { type: "ephemeral" },
        },
      ] as any,
      messages: trimmedMessages,
    });

    const aiText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "No response";

    // Extract profile updates every 4 messages using Haiku (cheap)
    let profileUpdates = null;
    if (messages.length % 4 === 0 && messages.length > 0) {
      profileUpdates = await extractProfile(
        trimmedMessages,
        aiText,
        userProfile
      );
    }

    return Response.json({ result: aiText, profileUpdates });

  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function extractProfile(
  messages: any[],
  latestResponse: string,
  existingProfile: any
): Promise<any> {
  try {
    const recentExchange = messages
      .slice(-6)
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const extraction = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Extract profile information from this conversation excerpt. Return ONLY new information not already in the existing profile.

EXISTING PROFILE:
${JSON.stringify(existingProfile || {})}

RECENT CONVERSATION:
${recentExchange}
ASSISTANT: ${latestResponse}

Return a JSON object with ONLY new fields detected. Omit fields with no new info. Use null for unknown.
{
  "userPattern": "reaches harder | steps back | balanced | mixed | null",
  "partnerPattern": "reaches harder | steps back | steady | null",
  "relationshipFacts": ["array of NEW facts only - e.g. trust issues, long distance, infidelity"],
  "recurringThemes": ["array of NEW themes - e.g. fear of abandonment, hypervigilance"],
  "growthSignals": ["array of growth signals detected in this exchange"],
  "assessmentComplete": true or false or null
}

Return ONLY valid JSON. No explanation. No markdown backticks.`,
        },
      ],
    });

    const raw =
      extraction.content[0].type === "text"
        ? extraction.content[0].text.trim()
        : "{}";

    // Clean and parse
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Filter out null values
    const filtered: any = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value) && value.length > 0) {
          filtered[key] = value;
        } else if (!Array.isArray(value)) {
          filtered[key] = value;
        }
      }
    });

    return Object.keys(filtered).length > 0 ? filtered : null;

  } catch (e) {
    console.error("Profile extraction failed silently:", e);
    return null;
  }
}

function buildMemoryBlock(userProfile: any, sessionNumber: number): string {
  if (!userProfile || Object.keys(userProfile).length === 0) return "";

  const lines = ["RETURNING USER — PROFILE LOADED:"];

  if (userProfile.userPattern) {
    lines.push(`- Pattern: ${userProfile.userPattern}`);
  }
  if (userProfile.partnerPattern) {
    lines.push(`- Partner pattern: ${userProfile.partnerPattern}`);
  }
  if (userProfile.relationshipFacts?.length > 0) {
    lines.push(`- Relationship facts: ${userProfile.relationshipFacts.join(", ")}`);
  }
  if (userProfile.recurringThemes?.length > 0) {
    lines.push(`- Recurring themes: ${userProfile.recurringThemes.join(", ")}`);
  }
  if (userProfile.growthSignals?.length > 0) {
    lines.push(`- Growth signals so far: ${userProfile.growthSignals.join(", ")}`);
  }
  if (userProfile.lastSessionSummary) {
    lines.push(`- Last session: ${userProfile.lastSessionSummary}`);
  }
  if (sessionNumber) {
    lines.push(`- Session number: ${sessionNumber}`);
  }

  lines.push("\nDo not ask for information already in this profile. Use it to personalise coaching from the first message.");

  return lines.join("\n");
}