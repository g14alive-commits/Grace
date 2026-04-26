import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId) {
    const { data, error } = await adminSupabase
      .from("grace_logs")
      .select("id, session_number, user_message, grace_response, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  const { data, error } = await adminSupabase
    .from("users")
    .select("id, email, name, user_pattern, session_count, last_seen_at")
    .order("last_seen_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
