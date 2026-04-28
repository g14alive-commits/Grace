import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => { cookiesToSet.push(...cookies); },
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const { data: { user } } = await supabase.auth.getUser();

  let redirectPath = "/login";

  if (user?.email) {
    // Check waitlist approval before deciding where to send the user
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: entry } = await admin
      .from("waitlist")
      .select("approved")
      .eq("email", user.email.toLowerCase())
      .single();

    if (!entry) {
      redirectPath = "/waitlist";
    } else if (!entry.approved) {
      redirectPath = "/pending";
    } else {
      // Approved — check onboarding status
      const { data: dbUser } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      redirectPath = dbUser?.onboarding_complete ? "/profile" : "/onboarding";
    }
  }

  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}
