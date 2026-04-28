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

  // ── Sessions for a user ────────────────────────────────
  if (userId) {
    const { data, error } = await adminSupabase
      .from("sessions")
      .select("id, session_number, headline, summary, action_taken, key_insight, growth_signals, is_complete, completed_at, action_completed, started_at")
      .eq("user_id", userId)
      .order("session_number", { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  // ── Users list ─────────────────────────────────────────
  const { data, error } = await adminSupabase
    .from("users")
    .select("id, email, name, user_pattern, session_count, last_seen_at, last_checkin_response")
    .order("last_seen_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
