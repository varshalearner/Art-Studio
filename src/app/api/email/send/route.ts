import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * Transactional email via Resend. In demo mode (no RESEND_API_KEY) it
 * no-ops successfully so callers never need to care which mode is active.
 */
export async function POST(req: Request) {
  const { userId, to, subject, text, href } = await req.json();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ sent: false, demo: true });
  }

  let recipient: string | undefined = to;
  if (!recipient && userId) {
    const supabase = getServiceSupabase();
    if (supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      recipient = data?.email;
    }
  }
  if (!recipient || !subject) {
    return NextResponse.json({ error: "Missing recipient or subject" }, { status: 400 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Amber Easel Studio";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to: recipient,
    subject: `${siteName} · ${subject}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #FAF6EF; border-radius: 12px; color: #3F3A35;">
        <h2 style="color: #C96F4A; margin-top: 0;">${subject}</h2>
        <p style="font-size: 15px; line-height: 1.6;">${String(text ?? "")}</p>
        ${href ? `<p><a href="${siteUrl}${href}" style="display:inline-block;background:#C96F4A;color:#fff;padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:bold;">Open in the studio</a></p>` : ""}
        <p style="font-size: 12px; color: #8a8178;">— ${siteName}</p>
      </div>`,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
