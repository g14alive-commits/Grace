import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      userName, 
      isAbrupt, 
      closingOverride,
      userId,
      sessionNumber,
      userProfile,
    } = await req.json();

    const allMessages = messages
      .map((m: string) => {
        if (m.startsWith("You: ")) return `User: ${m.replace("You: ", "")}`;
        return `Grace: ${m.replace("Grace: ", "")}`;
      })
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: isAbrupt ?
`Be concise. Total JSON response must fit within 400 tokens. If space is tight, shorten summary and themes first, never cut closing_message or action_taken.

This session ended mid-conversation. Return ONLY valid JSON, no markdown. The JSON must be complete and properly closed.

${allMessages}

Return this exact JSON:
{
  "summary": "2-3 sentences. What they came with and what was unresolved.",
  "themes": ["theme1"],
  "key_words": ["significant phrase the user said"],
  "action_taken": "The last thing Grace suggested, written to the user in second person. The single most specific thing the user committed to doing. If nothing was agreed, write 'none'.",
  "growth_signals": ["any positive shifts detected, or none"],
  "headline": "3-4 words max, self-focused",
  "closing_message": "One warm sentence acknowledging what they worked on and inviting them to pick it up next time. Under 30 words."
}`
:
`Be concise. Total JSON response must fit within 400 tokens. If space is tight, shorten summary and themes first, never cut closing_message or action_taken.

Read this therapy session and extract key information. Return ONLY valid JSON, no markdown. The JSON must be complete and properly closed with all brackets. Never use clinical words like "nervous system", "dysregulated", "attachment", "anxious", "avoidant". Use plain human language.
${allMessages}
Return this exact JSON:
{
  "summary": "Use this exact format:\nIssue: [one-two line on what they came with]\nGrowth signals: [any positive shifts detected, or 'none']\nAction agreed: [the thing they committed to, or 'none']\nTone shift: [yes / partial / no]\nRelationship facts added: [any new facts about their relationship extracted, or 'none']",
  "pattern": "reaches harder / steps back / balanced — detect from conversation. This is for internal DB only, never display to user.",
  "themes": ["theme1", "theme2"],
  "key_words": ["significant phrase the user said"],
  "action_taken": "Max 2-3 sentences only. The single most specific thing the user committed to doing. Start with 'you' not 'he/she/they'. Example: 'You agreed to send one short message to your partner today without waiting for the perfect words.' If no clear action was agreed, write the key insight in one sentence. Never more than 30 words.",
  "growth_signals": ["any positive shifts detected"],
  "headline": "2-3 words maximum. A chapter-heading style title, self-focused. Examples: 'Why I go quiet', 'Underneath the anger', 'Choosing to stay', 'First time I didn't run'. Never more than 4 words. Never mention the partner by name.",
  "closing_message": "A warm closing message from Grace. Follow this structure exactly — no more: (1) One plain sentence on why they came today.\n (2)key insight from the session — only include if there was a genuinely meaningful one, skip it entirely if not.\n (3) The action or decision they made. End with one warm human line. Address them by name if provided: ${userName || ""}. No clinical language. No lists. No bullet points. Under 50 words total. Be concise. Should feel like a real person closing a real conversation."
}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "{}";

    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]);
      const lastTen = messages.slice(-10);
      const { pattern, ...publicData } = parsed;

      console.log('Session close received:', { userId, sessionNumber, hasProfile: !!userProfile });

      // COMPRESSION — runs every 3 sessions if userProfile has large lists
      if (
        userId &&
        userProfile &&
        sessionNumber % 1 === 0
      ) {
        const facts = userProfile.relationshipFacts || [];
        const themes = userProfile.recurringThemes || [];
        const signals = userProfile.growthSignals || [];

        

        // Only compress if lists are getting large
        if (facts.length > 10 || themes.length > 8 || signals.length > 10) {
          try {
            const compression = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 300,
              messages: [{
                role: "user",
                content: `Compress these profile lists into concise summaries. Keep all meaningful patterns and facts. Remove redundancy and repetition. Max 3 sentences per section. Plain language only.

RELATIONSHIP FACTS: ${facts.join(', ')}

RECURRING THEMES: ${themes.join(', ')}

GROWTH SIGNALS: ${signals.join(', ')}

Return ONLY valid JSON:
{
  "relationship_facts_summary": "3 sentences max covering key facts",
  "recurring_themes_summary": "2 sentences max covering main patterns",
  "growth_summary": "2 sentences max covering growth trajectory"
}`
              }]
            });

            const compRaw = compression.content[0].type === "text" 
              ? compression.content[0].text.trim() 
              : null;

            if (compRaw) {
              const compCleaned = compRaw.replace(/```json|```/g, "").trim();
              const compMatch = compCleaned.match(/\{[\s\S]*\}/);
              if (compMatch) {
                const compressed = JSON.parse(compMatch[0]);

                // Save compressed profile back to Supabase
                
               const { error: compError } = await supabaseAdmin
               .from('users')
               .update({
                 relationship_facts_summary: compressed.relationship_facts_summary,
                 recurring_themes_summary: compressed.recurring_themes_summary,
                 growth_summary: compressed.growth_summary,
                 relationship_facts: [],
                 recurring_themes: [],
                 growth_signals: [],
                })
               .eq('id', userId);

            if (compError) console.error('Compression save error:', JSON.stringify(compError));
            else console.log('Profile compressed at session', sessionNumber);
              }
            }
          } catch (e) {
            console.error('Compression failed silently:', e);
            // Non-fatal — session continues normally
          }
        }
      }

      if (
  userId &&
  userProfile &&
  sessionNumber % 1 === 0
) {
  console.log('Compression block entered');
  const facts = userProfile.relationshipFacts || [];
  const themes = userProfile.recurringThemes || [];
  const signals = userProfile.growthSignals || [];
  console.log('List sizes:', { facts: facts.length, themes: themes.length, signals: signals.length });

  if (facts.length > 10 || themes.length > 8 || signals.length > 10) {
    console.log('Size check passed — starting compression');

      return Response.json({
        ...publicData,
        closing_message: closingOverride || parsed.closing_message,
        last_ten_messages: lastTen,
      });

    } catch (e) {
      console.error("Failed to parse session JSON:", raw);
      return Response.json({
        summary: "",
        themes: [],
        key_words: [],
        action_taken: "",
        growth_signals: [],
        headline: "",
        closing_message: "Something went wrong closing this session. Come back in a short while. Take care.",
        last_ten_messages: messages.slice(-10),
      });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
