import { supabase } from "./supabase";

export async function getOrCreateUser(userId: string, email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: newUser } = await supabase
      .from("users")
      .insert({ id: userId, email })
      .select()
      .single();
    return newUser;
  }

  return data;
}

export async function updateUserProfile(userId: string, profile: any) {
  const { data: existing } = await supabase
  .from("users")
  .select("relationship_facts, recurring_themes, growth_signals")
  .eq("id", userId)
  .single();

await supabase
  .from("users")
  .update({
    relationship_facts: [...new Set([...(existing?.relationship_facts || []), ...(profile.relationshipFacts || [])])],
    recurring_themes: [...new Set([...(existing?.recurring_themes || []), ...(profile.recurringThemes || [])])],
    growth_signals: [...new Set([...(existing?.growth_signals || []), ...(profile.growthSignals || [])])],
    user_pattern: profile.userPattern,
    partner_pattern: profile.partnerPattern,
    last_session_summary: profile.lastSessionSummary,
    assessment_complete: profile.assessmentComplete,
    session_count: profile.sessionCount || 0,
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId);
}

export async function getConversation(userId: string) {
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function saveConversation(userId: string, messages: string[]) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("conversations")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("conversations")
      .insert({ user_id: userId, messages });
  }
}

export function profileFromDb(dbUser: any) {
  if (!dbUser) return {};
  return {
    userPattern: dbUser.user_pattern,
    partnerPattern: dbUser.partner_pattern,
    relationshipFacts: dbUser.relationship_facts || [],
    recurringThemes: dbUser.recurring_themes || [],
    growthSignals: dbUser.growth_signals || [],
    lastSessionSummary: dbUser.last_session_summary,
    assessmentComplete: dbUser.assessment_complete,
    sessionCount: dbUser.session_count || 0,
  };
}

export async function getActiveSession(userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_complete", false)
    .gte("started_at", oneDayAgo)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function createSession(userId: string, sessionNumber: number) {
  const { data } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      session_number: sessionNumber,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  return data;
}

export async function updateSessionMessages(
  sessionId: string,
  userMessageCount: number,
  totalMessages: number
) {
  await supabase
    .from("sessions")
    .update({ 
      user_message_count: userMessageCount, 
      total_messages: totalMessages,
      last_message_at: new Date().toISOString()
    })
    .eq("id", sessionId);
}
export async function closeSession(
  sessionId: string,
  userId: string,
  summary: string,
  themes: string[],
  keyWords: string[],
  actionTaken: string,
  growthSignals: string[],
  headline: string,
  keyExcerpts: any[]
) {
  await supabase
    .from("sessions")
    .update({ 
      is_complete: true,
      summary,
      themes,
      key_words: keyWords,
      action_taken: actionTaken,
      growth_signals: growthSignals,
      headline,
      key_excerpts: keyExcerpts,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  const { data: currentUser } = await supabase
    .from("users")
    .select("session_count")
    .eq("id", userId)
    .single();

  await supabase
    .from("users")
    .update({
      last_session_summary: summary,
      last_session_themes: themes,
      last_session_action: actionTaken,
      last_session_key_words: keyWords,
      session_count: (currentUser?.session_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}  

// Update user's quick access fields and increment session count
  const { data: currentUser } = await supabase
    .from("users")
    .select("session_count")
    .eq("id", userId)
    .single();

  await supabase
    .from("users")
    .update({
      last_session_summary: summary,
      last_session_themes: themes,
      last_session_action: actionTaken,
      last_session_key_words: keyWords,
      session_count: (currentUser?.session_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export function buildSessionMemoryBlock(dbUser: any): string {
  if (!dbUser?.last_session_summary) return "";

  const lines = ["RETURNING USER — PREVIOUS SESSION:"];
  lines.push(`Summary: ${dbUser.last_session_summary}`);

  if (dbUser.last_session_themes?.length > 0) {
    lines.push(`Themes: ${dbUser.last_session_themes.join(", ")}`);
  }
  if (dbUser.last_session_key_words?.length > 0) {
    lines.push(`Key words from user: ${dbUser.last_session_key_words.join(", ")}`);
  }
  if (dbUser.last_session_action) {
    lines.push(`Action they committed to: ${dbUser.last_session_action}`);
  }

  lines.push(`
RETURNING SESSION OPENING — follow this structure:
1. Warm greeting — one line
2. Reference what was covered last time using the summary and themes above — in plain words, not clinical
3. Mention the action they committed to
4. Gently check in: "hope we are moving forward on that"
5. Open invitation: "what brings you here today? what are you facing in your relationship?"

Speak naturally. Never say "last session" robotically. Make it feel like a real person remembering.`);

  return lines.join("\n");
}

export async function updateUserBasicInfo(userId: string, info: {
  name?: string;
  gender?: string;
  relationshipStatus?: string;
  relationshipDuration?: string;
  ageRange?: string;
  country?: string;
}) {
  await supabase
    .from("users")
    .update({
      name: info.name,
      gender: info.gender,
      relationship_status: info.relationshipStatus,
      relationship_duration: info.relationshipDuration,
      age_range: info.ageRange,
      country: info.country,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export function buildUserContextBlock(dbUser: any): string {
  if (!dbUser) return "";
  const lines: string[] = [];

  if (dbUser.name) lines.push(`- User's name: ${dbUser.name} — address them by name naturally`);
  if (dbUser.gender) lines.push(`- Gender: ${dbUser.gender}`);
  if (dbUser.relationship_status) lines.push(`- Relationship status: ${dbUser.relationship_status}`);
  if (dbUser.relationship_duration) lines.push(`- Relationship duration: ${dbUser.relationship_duration}`);
  if (dbUser.age_range) lines.push(`- Age range: ${dbUser.age_range}`);

  if (lines.length === 0) return "";

  return "USER CONTEXT:\n" + lines.join("\n") + "\n\nIMPORTANT: The user's name is provided above. Use it. Address them by name at least once early in the conversation and occasionally after that — when it feels warm and natural. Never go a whole session without using their name at least once.";
}