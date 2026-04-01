import { supabase } from "./supabase";

export async function getOrCreateUser(userId: string, email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // User doesn't exist yet — create them
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
  await supabase
    .from("users")
    .update({
      user_pattern: profile.userPattern,
      partner_pattern: profile.partnerPattern,
      relationship_facts: profile.relationshipFacts || [],
      recurring_themes: profile.recurringThemes || [],
      growth_signals: profile.growthSignals || [],
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
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        messages,
      });
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