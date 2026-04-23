import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "./system-prompt";
import { createClient } from "@supabase/supabase-js";
import { buildSessionMemoryBlock, buildUserContextBlock, getOrCreateUser } from "../../../lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const {
      messages,
      userProfile,
      sessionNumber,
      sessionMemory,
      isNewSession,
      userId,
      lastSessionDate,
      clientTime,
    } = await req.json();

    const dbUser = userId ? await getOrCreateUser(userId, "") : null;

    const timeStr = clientTime || new Date().toUTCString();
    const timeSinceLastSession = lastSessionDate
      ? (() => {
          const diff = Date.now() - new Date(lastSessionDate).getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
          if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
          return "less than an hour ago";
        })()
      : null;

    const sessionContext = `Session number: ${sessionNumber}. Current time: ${timeStr}.${timeSinceLastSession ? ` Last session was ${timeSinceLastSession}.` : ""} ${isNewSession ? "This is a new session." : "This is a returning user — do not introduce yourself."}`;
    const memoryBlock = buildMemoryBlock(userProfile, sessionNumber);
    const userContextBlock = buildUserContextBlock(dbUser);
    const contextBlock = [userContextBlock, sessionContext, sessionMemory || memoryBlock].filter(Boolean).join("\n\n");

    const dynamicBlock = contextBlock;

    const MAX_MESSAGES = 20;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
        {
          type: "text",
          text: dynamicBlock,
        },
      ] as any,
      messages: trimmedMessages,
    });



    const aiText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "No response";

    const sessionComplete = detectSessionClose(aiText);

    // Extract profile updates every 4 messages
    let profileUpdates = null;
    if (messages.length % 4 === 0 && messages.length > 0) {
      profileUpdates = await extractProfile(trimmedMessages, aiText, userProfile);
    }

    // Save suggested action immediately if detected
    if (profileUpdates?.suggestedAction && userId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase
          .from("users")
          .update({ last_session_action: profileUpdates.suggestedAction })
          .eq("id", userId);
      } catch (e) {
        console.error("Failed to save suggested action:", e);
      }
    }

    return Response.json({ result: aiText, profileUpdates, sessionComplete });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function detectSessionClose(text: string): boolean {
  const closeSignals = [
    "see you next time",
    "until next time",
    "take care, ",
    "I'll be here when you come back.",
    "goodbye",
    "good bye",
    "bye",
    "come back when you're ready",
    "pick this up next time",
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
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

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