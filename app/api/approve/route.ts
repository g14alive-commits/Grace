import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { id, email, name } = await req.json();

    if (!id || !email) {
      return NextResponse.json({ error: "Missing id or email" }, { status: 400 });
    }

    // 1. Mark approved in waitlist table
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ approved: true })
      .eq("id", id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
    }

    // 2. Generate magic link via Supabase admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: "https://heyattune.app/profile",
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Magic link error:", linkError);
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 });
    }

    const loginLink = linkData.properties.action_link;

    // 3. Send approval email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Attune <team@heyattune.app>",
      to: email,
      subject: "Your spot on Attune is ready",
      html: `
        <div style="background:#0d0e1a;padding:48px 32px;font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;">
          <p style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:rgba(245,238,255,0.92);margin:0 0 24px;">Your spot is ready.</p>
          <p style="font-size:15px;font-weight:300;line-height:1.7;color:rgba(170,160,210,0.80);margin:0 0 12px;">
            We're glad you stuck around${name ? `, ${name.split(" ")[0]}` : ""}. Click below to get in — takes 30 seconds.
          </p>
          <p style="margin:32px 0;">
            <a href="${loginLink}" style="display:inline-block;background:linear-gradient(135deg,#b070ff,#4020c0);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:400;letter-spacing:0.02em;">
              Get started →
            </a>
          </p>
          <p style="font-size:14px;font-weight:300;line-height:1.7;color:rgba(150,140,190,0.60);margin:0 0 32px;">
            Take your time once you're inside. No pressure to have it all figured out.
          </p>
          <p style="font-size:13px;color:rgba(120,110,160,0.50);margin:0;">— Team Attune</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      // Don't fail the whole request — user is approved, email just didn't send
      return NextResponse.json({ success: true, emailSent: false });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error("Approve route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
