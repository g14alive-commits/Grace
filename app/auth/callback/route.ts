import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_complete")
    .eq("id", session.user.id)
    .single();
  if (!user?.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }
}
return NextResponse.redirect(`${origin}/`);
}