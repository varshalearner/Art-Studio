"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Wrench, XCircle } from "lucide-react";
import { isSupabaseLive } from "@/config";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SetupStatus {
  supabase: {
    publicKeys: boolean;
    serviceRoleKey: boolean;
    connected: boolean;
    tablesOk: boolean;
    missingTables: string[];
    storageOk: boolean;
    adminExists: boolean;
  };
  payments: {
    razorpayPublic: boolean;
    razorpaySecret: boolean;
    razorpayWebhook: boolean;
    paypalPublic: boolean;
    paypalSecret: boolean;
  };
  email: { resend: boolean };
  exchangeRates: { apiKey: boolean };
}

function Item({ ok, label, fix }: { ok: boolean; label: string; fix?: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" aria-label="OK" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" aria-label="Missing" />
      )}
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {!ok && fix && <p className="text-xs text-muted-foreground">{fix}</p>}
      </div>
    </li>
  );
}

export function SetupChecker() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // open in demo mode, admin-only in live mode
  useEffect(() => {
    if (isSupabaseLive && !loading && (!user || user.role !== "admin")) {
      router.replace("/login?next=/setup");
    }
  }, [loading, user, router]);

  const { data: status } = useQuery<SetupStatus>({
    queryKey: ["setup-status"],
    queryFn: async () => (await fetch("/api/setup/status")).json(),
  });

  const s = status?.supabase;
  const p = status?.payments;

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-accent/20 p-3">
          <Wrench className="h-6 w-6 text-mustard-dark" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">Setup checker</h1>
          <p className="text-sm text-muted-foreground">
            The app works fully in demo mode. Each service goes live the moment its keys exist —
            no code changes needed.
          </p>
        </div>
      </div>

      {!status ? (
        <Skeleton className="mt-8 h-72 rounded-lg" />
      ) : (
        <div className="mt-8 space-y-6" data-testid="setup-checklist">
          <Card>
            <CardHeader>
              <CardTitle>Supabase (auth · database · storage · realtime)</CardTitle>
              <CardDescription>
                {s?.publicKeys ? "Live mode" : "Demo mode — data lives in this browser's localStorage"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                <Item
                  ok={!!s?.publicKeys}
                  label="Supabase keys in environment"
                  fix="Create a free project at supabase.com, then add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example) and restart."
                />
                <Item
                  ok={!!s?.serviceRoleKey}
                  label="Service role key (server-side checks & webhooks)"
                  fix="Add SUPABASE_SERVICE_ROLE_KEY from Project Settings → API. Keep it secret — server only."
                />
                <Item
                  ok={!!s?.connected}
                  label="Supabase connected"
                  fix="Keys are set but the connection failed — double-check the URL and keys."
                />
                <Item
                  ok={!!s?.tablesOk}
                  label={
                    s?.missingTables?.length
                      ? `Tables found (missing: ${s.missingTables.join(", ")})`
                      : "All tables found"
                  }
                  fix="Open the Supabase SQL editor and run supabase/schema.sql from this project (one paste). Optionally run seed.sql for sample data."
                />
                <Item
                  ok={!!s?.storageOk}
                  label="Storage bucket 'artworks' ready"
                  fix="schema.sql creates it; or create a public bucket named 'artworks' under Storage."
                />
                <Item
                  ok={!!s?.adminExists}
                  label="Admin user exists"
                  fix="Sign up once in the app, then run in the SQL editor: update public.profiles set role = 'admin' where email = 'you@example.com';"
                />
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                {p?.razorpayPublic || p?.paypalPublic ? "Live providers configured" : "Mock payments active"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                <Item
                  ok={!!p?.razorpayPublic && !!p?.razorpaySecret}
                  label="Razorpay keys (India + international + UPI)"
                  fix="dashboard.razorpay.com → API Keys. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Start with test keys (rzp_test_…)."
                />
                <Item
                  ok={!!p?.razorpayWebhook}
                  label="Razorpay webhook secret"
                  fix="Dashboard → Webhooks → add {your-site}/api/payments/razorpay/webhook, then set RAZORPAY_WEBHOOK_SECRET."
                />
                <Item
                  ok={!!p?.paypalPublic && !!p?.paypalSecret}
                  label="PayPal keys (international buyers)"
                  fix="developer.paypal.com → Apps & Credentials. Add NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET."
                />
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email & extras</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                <Item
                  ok={!!status.email.resend}
                  label="Resend (transactional email)"
                  fix="resend.com → API Keys → add RESEND_API_KEY, and EMAIL_FROM after verifying your domain."
                />
                <Item
                  ok={!!status.exchangeRates.apiKey}
                  label="Exchange-rate API key"
                  fix="Optional — exchangerate-api.com free key as EXCHANGE_RATE_API_KEY. Built-in approximate rates are used otherwise."
                />
              </ul>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Full go-live walkthrough in the project README. On Vercel, add the same variables under
            Project → Settings → Environment Variables and redeploy.
          </p>
        </div>
      )}
    </div>
  );
}
