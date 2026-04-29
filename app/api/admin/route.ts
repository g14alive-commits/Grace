import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const stats = searchParams.get("stats");

  // ── Stats ──────────────────────────────────────────────
  if (stats === "true") {
    const [
      { count: totalUsers },
      { count: totalCompleted },
      { data: checkins },
    ] = await Promise.all([
      adminSupabase.from("users").select("*", { count: "exact", head: true }),
      adminSupabase.from("sessions").select("*", { count: "exact", head: true }).eq("is_complete", true),
      adminSupabase.from("checkins").select("response"),
    ]);

    const yes = checkins?.filter(c => c.response === "yes").length ?? 0;
    const tried = checkins?.filter(c => c.response === "tried").length ?? 0;
    const notYet = checkins?.filter(c => c.response === "not_yet").length ?? 0;

    return Response.json({
      totalUsers: totalUsers ?? 0,
      totalCompleted: totalCompleted ?? 0,
      totalCheckins: (checkins?.length) ?? 0,
      yes,
      tried,
      notYet,
    });
  }

  // ── Grace logs for a user ─────────────────────────────
  if (userId) {
    const [{ data, error }, { count: sessionsCompleted }] = await Promise.all([
      adminSupabase
        .from("grace_logs")
        .select("id, session_number, user_message, grace_response, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      adminSupabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_complete", true),
    ]);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ logs: data, sessionsCompleted: sessionsCompleted ?? 0 });
  }

  // ── Users list ─────────────────────────────────────────
  const [{ data, error }, { data: sessionRows }] = await Promise.all([
    adminSupabase
      .from("users")
      .select("id, email, name, user_pattern, session_count, last_seen_at, last_checkin_response, recurring_themes_summary, recurring_themes, last_session_action, relationship_facts_summary, relationship_facts, growth_summary")
      .order("last_seen_at", { ascending: false }),
    adminSupabase
      .from("sessions")
      .select("user_id")
      .eq("is_complete", true),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const completedCountByUser: Record<string, number> = {};
  for (const s of sessionRows ?? []) {
    completedCountByUser[s.user_id] = (completedCountByUser[s.user_id] ?? 0) + 1;
  }

  const usersWithCounts = (data ?? []).map((u) => ({
    ...u,
    completed_sessions: completedCountByUser[u.id] ?? 0,
  }));

  return Response.json(usersWithCounts);
}
