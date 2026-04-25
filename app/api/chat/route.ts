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
    console.log('DYNAMIC BLOCK SIZE:', dynamicBlock.length, 'chars');
    console.log('DYNAMIC BLOCK:', dynamicBlock);

    const MAX_MESSAGES = 12;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" }
        },
        {
          type: "text",
          text: dynamicBlock,
        },
      ] as any,
      messages: trimmedMessages,
    });
console.log('Cache stats:', JSON.stringify({
  cache_creation: response.usage.cache_creation_input_tokens,
  cache_read: response.usage.cache_read_input_tokens,
  input: response.usage.input_tokens,
}));

console.log('CACHE:', {
  write: response.usage.cache_creation_input_tokens,
  read: response.usage.cache_read_input_tokens,
  input: response.usage.input_tokens,
  output: response.usage.output_tokens,
});

    const aiText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "No response";
    console.log('DEBUG:', { userId, sessionNumber, hasMessages: trimmedMessages.length });

        if (userId) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabase.from('grace_logs').insert({
    user_id: userId,
    session_number: sessionNumber,
    user_message: trimmedMessages[trimmedMessages.length - 1]?.content,
    grace_response: aiText,
  });
}

    const sessionComplete = detectSessionClose(aiText);
    return Response.json({ result: aiText, sessionComplete });
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