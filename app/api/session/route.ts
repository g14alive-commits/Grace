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
      max_tokens: 700,
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
  "themes": ["2-4 themes in plain second-person language the user can read and recognise themselves in. Example: 'Reaching for reassurance when scared', 'Confusing presence with love'. Not clinical observations."],
  "key_words": ["significant phrase the user said"],
  "action_taken": "Start with 'You decided to' followed by one specific physical action doable in the next 24 hours. Max 12 words total. Example: 'You decided to send one honest message without waiting for perfect words.' Grace should always find an action — even in exploratory sessions find one small thing. Only write 'none' if the session was purely crisis or safety.",
  "key_insight": "One plain sentence capturing the most important thing the user understood or named today. Written in second person. Example: 'You realised you were testing him instead of asking directly.' Only include if genuinely meaningful. If nothing significant, write 'none'.",
  "growth_signals": ["Written in second person. Example: 'You waited before reaching out' not 'User waited'. 2-4 signals only. Write 'none' if no growth signals detected."],
  "new_relationship_facts": ["max 5 new facts about this user's relationship situation discovered in THIS session only. Plain observations. Not repeated from before. Empty array if none."],
  "new_recurring_themes": ["max 3 new behavioural themes detected in THIS session only. Plain language. Empty array if none."],
  "new_growth_signals": ["max 3 growth signals from THIS session only. Second person. Example: 'You waited before reaching out'. Empty array if none."]
  "headline": "3-4 words max, self-focused",
  "closing_message": "One warm sentence acknowledging what they worked on and inviting them to pick it up next time. Under 30 words."
}`
:
`Be concise. Total JSON response must fit within 400 tokens. If space is tight, shorten summary and themes first, never cut closing_message or action_taken.

Read this therapy session and extract key information. Return ONLY valid JSON, no markdown. The JSON must be complete and properly closed with all brackets. Never use clinical words like "nervous system", "dysregulated", "attachment", "anxious", "avoidant". Use plain human language.
${allMessages}
Return this exact JSON:
{
  "summary": "Use this exact format:\\nIssue: [one-two line on what they came with]\\nGrowth signals: [any positive shifts detected, or 'none']\\nAction agreed: [the thing they committed to, or 'none']\\nTone shift: [yes / partial / no]\\nRelationship facts added: [any new facts about their relationship extracted, or 'none']",
  "pattern": "reaches harder / steps back / balanced — detect from conversation. This is for internal DB only, never display to user.",
  "themes": ["2-4 themes in plain second-person language the user can read and recognise themselves in. Example: 'Reaching for reassurance when scared', 'Confusing presence with love'. Not clinical observations."],
  "key_words": ["significant phrase the user said"],
  "action_taken": "Start with 'You decided to' followed by one specific physical action doable in the next 24 hours. Max 12 words total. Example: 'You decided to send one honest message without waiting for perfect words.' Grace should always find an action — even in exploratory sessions find one small thing. Only write 'none' if the session was purely crisis or safety.",
  "key_insight": "One plain sentence capturing the most important thing the user understood or named today. Written in second person. Example: 'You realised you were testing him instead of asking directly.' Only include if genuinely meaningful. If nothing significant, write 'none'.",
  "growth_signals": ["Written in second person. Example: 'You waited before reaching out' not 'User waited'. 2-4 signals only."],
  "new_relationship_facts": ["max 5 new facts about this user's relationship situation discovered in THIS session only. Plain observations. Not repeated from before. Empty array if none."],
  "new_recurring_themes": ["max 3 new behavioural themes detected in THIS session only. Plain language. Empty array if none."],
  "new_growth_signals": ["max 3 growth signals from THIS session only. Second person. Example: 'You waited before reaching out'. Empty array if none."]
  "headline": "2-3 words maximum. A chapter-heading style title, self-focused. Examples: 'Why I go quiet', 'Underneath the anger', 'Choosing to stay', 'First time I didn't run'. Never more than 4 words. Never mention the partner by name.",
  "closing_message": "A warm closing message from Grace. Follow this structure exactly — no more: (1) One plain sentence on why they came today.\\n (2)key insight from the session — only include if there was a genuinely meaningful one, skip it entirely if not.\\n (3) The action or decision they made. End with one warm human line. Address them by name if provided: ${userName || ''}. No clinical language. No lists. No bullet points. Under 50 words total. Be concise. Should feel like a real person closing a real conversation."
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
      console.log('Compression check:', { userId: !!userId, hasProfile: !!userProfile, sessionNumber, mod: sessionNumber % 1 });

      if (userId && userProfile && sessionNumber % 1 === 0) {
        console.log('Compression block entered');
        const facts = userProfile.relationshipFacts || [];
        const themes = userProfile.recurringThemes || [];
        const signals = userProfile.growthSignals || [];
        console.log('List sizes:', { facts: facts.length, themes: themes.length, signals: signals.length });

        if (facts.length > 10 || themes.length > 8 || signals.length > 10) {
          console.log('Size check passed — starting compression');
          try {
            const compression = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 300,
              messages: [{
                role: "user",
                content: `Compress these profile lists into concise summaries. Keep all meaningful patterns and facts. Remove redundancy and repetition. Max 3 sentences per section. Plain language only.

RELATIONSHIP FACTS: ${facts.slice(-20).join(', ')}

RECURRING THEMES: ${themes.slice(-15).join(', ')}

GROWTH SIGNALS: ${signals.slice(-15).join(', ')}

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
            console.error('Compression failed:', e);
          }
        }
      }

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