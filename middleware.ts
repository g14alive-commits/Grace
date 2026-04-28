import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/chat", "/profile", "/rewrite", "/actions"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Read auth session from cookies (set by the SSR auth callback)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Use service role to bypass RLS on waitlist table
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
    return NextResponse.redirect(new URL("/waitlist", request.url));
  }
  if (!entry.approved) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/chat/:path*", "/profile/:path*", "/rewrite/:path*", "/actions/:path*"],
};
