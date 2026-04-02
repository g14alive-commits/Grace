import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "./system-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { messages, userProfile, sessionNumber, sessionMemory, isNewSession, twoHourWarning, userId } = await req.json();

if (profileUpdates?.suggestedAction && userId) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase
    .from("users")
    .update({ last_session_action: profileUpdates.suggestedAction })
    .eq("id", userId);
}


    // Ignore keep-alive pings silently
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content === "__ping__") {
      return Response.json({ result: null });
    }

    const memoryBlock = buildMemoryBlock(userProfile, sessionNumber);

    // Build full prompt — session memory takes priority over regular memory block
    const contextBlock = sessionMemory || (memoryBlock ? memoryBlock : "");

    // Add two hour warning to prompt if needed
    const twoHourBlock = twoHourWarning
      ? `\n\nSESSION TIME LIMIT: This user has been in active conversation for 2 hours. After your next response, gently close the session. Say something warm like: "We've covered a lot today. I think this is a good place to pause — take some time with what came up. I'll be here when you're ready. Want to stop here for today, or is there something else on your mind?" Then wait for their response. If they want to continue, honour that. If they say goodbye or indicate they're done, close warmly.`
      : "";

    const fullPrompt =
      systemPrompt +
      (contextBlock ? "\n\n" + contextBlock : "") +
      twoHourBlock;

    const MAX_MESSAGES = 20;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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

    // Detect if Grace is closing the session naturally
    const sessionComplete = detectSessionClose(aiText);

    // Extract profile updates every 4 messages
    let profileUpdates = null;
    if (messages.length % 4 === 0 && messages.length > 0) {
      profileUpdates = await extractProfile(trimmedMessages, aiText, userProfile);
    }

    return Response.json({ result: aiText, profileUpdates, sessionComplete });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function detectSessionClose(text: string): boolean {
  const closeSignals = [
    "take some time with what came up",
    "i'll be here when you're ready",
    "that's enough for today",
    "good place to pause",
    "pick this up next time",
    "take care of yourself",
    "well done today",
    "you've done real work today",
    "sit with that",
    "that's the work",
    "come back when",
    "see you next time",
    "until next time",
    "rest now",
    "that's all for today",
    "you've done enough today",
  ];
  const lower = text.toLowerCase();
  return closeSignals.some((signal) => lower.includes(signal));
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

IMPORTANT RULES:
- Only set partnerPattern if the user has explicitly described their partner's behaviour in detail. Never infer it from the user's own pattern.
- Only set userPattern if there is strong evidence from multiple answers. Never guess from one or two responses.
- assessmentComplete should only be true if Grace has explicitly delivered the assessment result message.

Return a JSON object with ONLY new fields detected. Omit fields with no new info. Use null for unknown.
{
  "userPattern": "reaches harder | steps back | balanced | mixed | null",
  "partnerPattern": "reaches harder | steps back | steady | null",
  "relationshipFacts": ["array of NEW facts only"],
  "recurringThemes": ["array of NEW themes"],
  "growthSignals": ["array of growth signals detected"],
"assessmentComplete": true or false or null,
"suggestedAction": "the specific action or next step Grace most recently suggested to the user, if any — null if none detected"
}

Return ONLY valid JSON. No explanation. No markdown backticks.`,
        },
      ],
    });

    const raw =
      extraction.content[0].type === "text"
        ? extraction.content[0].text.trim()
        : "{}";

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

// Save suggested action to users table immediately
if (parsed.suggestedAction && userId) {
  const { supabase } = await import("../../../lib/supabase");
  await supabase
    .from("users")
    .update({ last_session_action: parsed.suggestedAction })
    .eq("id", userId);
}
      if (value !== null && value !== undefined) {
        if (Array.isArray(value) && value.length > 0) {
          filtered[key] = value;
        } else if (!Array.isArray(value)) {
          filtered[key] = value;
        }
      };

    return Object.keys(filtered).length > 0 ? filtered : null;
  } catch (e) {
    console.error("Profile extraction failed silently:", e);
    return null;
  }
}

function buildMemoryBlock(userProfile: any, sessionNumber: number): string {
  if (!userProfile || Object.keys(userProfile).length === 0) return "";

  const lines = ["RETURNING USER — PROFILE LOADED:"];

  if (userProfile.userPattern) lines.push(`- Pattern: ${userProfile.userPattern}`);
  if (userProfile.partnerPattern) lines.push(`- Partner pattern: ${userProfile.partnerPattern}`);
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
  if (sessionNumber) lines.push(`- Session number: ${sessionNumber}`);

  lines.push("\nDo not ask for information already in this profile. Use it to personalise coaching from the first message.");

  return lines.join("\n");
}