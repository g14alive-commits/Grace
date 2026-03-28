import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "./system-prompt";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

console.log("Prompt length:", systemPrompt.length); // add this line

export async function POST(req: Request) {
  try {
    const { messages, userProfile, sessionNumber } = await req.json();

    const memoryBlock = buildMemoryBlock(userProfile, sessionNumber);

    const MAX_MESSAGES = 20;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      temperature: 0.6,
      system: systemPrompt + (memoryBlock ? "\n\n" + memoryBlock : ""),
      messages: trimmedMessages,
    });

    const aiText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "No response";

    return Response.json({ result: aiText });

  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
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

