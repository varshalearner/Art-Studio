import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "profiles",
  "listings",
  "orders",
  "commissions",
  "threads",
  "messages",
  "notifications",
  "reviews",
  "reports",
  "audit_log",
  "wishlists",
];

/** Server-side checks for the /setup page. */
export async function GET() {
  const supabaseKeys = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let connected = false;
  let tablesOk = false;
  const missingTables: string[] = [];
  let storageOk = false;
  let adminExists = false;

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(0);
        if (error) missingTables.push(table);
      }
      connected = true;
      tablesOk = missingTables.length === 0;

      const { data: buckets } = await supabase.storage.listBuckets();
      storageOk = Boolean(buckets?.some((b) => b.name === "artworks"));

      if (!missingTables.includes("profiles")) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        adminExists = (count ?? 0) > 0;
      }
    } catch {
      connected = false;
    }
  }

  return NextResponse.json({
    supabase: {
      publicKeys: supabaseKeys,
      serviceRoleKey: serviceRole,
      connected,
      tablesOk,
      missingTables,
      storageOk,
      adminExists,
    },
    payments: {
      razorpayPublic: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
      razorpaySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
      razorpayWebhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      paypalPublic: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
      paypalSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    },
    email: { resend: Boolean(process.env.RESEND_API_KEY) },
    exchangeRates: { apiKey: Boolean(process.env.EXCHANGE_RATE_API_KEY) },
  });
}
