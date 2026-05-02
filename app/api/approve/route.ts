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
      subject: "Your Attune access",
      text: `Hi${name ? ` ${name.split(" ")[0]}` : ""},\n\nYour spot on Attune is ready.\n\nEnter Attune: ${loginLink}\n\nReady whenever you are.\n\nIf this landed in spam, mark it as not spam so future emails reach you.\n\n— Team Attune\nheyattune.app`,
      html: `
        <div style="background:#ffffff;padding:48px 32px;font-family:Georgia,serif;max-width:480px;margin:0 auto;">
          <p style="font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:400;color:#9070cc;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 32px;">attune</p>
          <p style="font-size:26px;font-weight:400;color:#1a1a2e;margin:0 0 24px;line-height:1.3;">Your spot is ready${name ? `, ${name.split(" ")[0]}` : ""}.</p>
          <p style="font-size:15px;font-weight:400;line-height:1.75;color:#4a4a6a;margin:0 0 32px;font-family:'Helvetica Neue',Arial,sans-serif;">
            We've been looking forward to this. Click the link below to get in — it only takes a moment.
          </p>
          <p style="margin:0 0 36px;">
            <a href="${loginLink}" style="display:inline-block;background:#7040e0;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:400;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:0.02em;">
              Enter Attune →
            </a>
          </p>
          <p style="font-size:14px;font-weight:400;line-height:1.75;color:#6a6a8a;margin:0 0 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
            Ready whenever you are.
          </p>
          <hr style="border:none;border-top:1px solid #ebebf0;margin:0 0 24px;" />
          <p style="font-size:12px;color:#a0a0b8;margin:0 0 8px;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6;">
            — Team Attune<br/>
            <a href="https://heyattune.app" style="color:#9070cc;text-decoration:none;">heyattune.app</a>
          </p>
          <p style="font-size:11px;color:#c0c0d0;margin:0;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6;">
            If this landed in spam, mark it as not spam so future emails reach you.
          </p>
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