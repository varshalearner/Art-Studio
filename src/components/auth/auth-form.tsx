"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Palette, ShieldCheck, Paintbrush, ShoppingBag } from "lucide-react";
import * as auth from "@/services/auth";
import { useAuth } from "@/components/auth-context";
import { demoFlags } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(4, "At least 4 characters"),
});
type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const finish = async () => {
    await refresh();
    router.push(next);
  };

  const onSubmit = async (values: FormValues) => {
    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(values.email, values.password);
      } else {
        await auth.signUp(values.name || "", values.email, values.password);
      }
      await finish();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (kind: "buyer" | "seller" | "admin") => {
    setBusy(true);
    try {
      await auth.loginAsDemo(kind);
      await finish();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await auth.signInWithGoogle();
      await finish();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex justify-center py-14">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="rounded-full bg-primary/15 p-3">
            <Palette className="h-6 w-6 text-primary" aria-hidden />
          </span>
          <CardTitle className="text-2xl">
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {mode === "register" && (
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" className="mt-1" autoComplete="name" {...register("name")} />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                className="mt-1"
                autoComplete="email"
                data-testid="auth-email"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                className="mt-1"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                data-testid="auth-password"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="auth-submit">
              {mode === "login" ? t("login") : t("register")}
            </Button>
          </form>

          <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
            {t("google")}
          </Button>

          {demoFlags.supabase && (
            <div className="rounded-md border-2 border-dashed border-accent/60 bg-accent/10 p-3">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("demoLogins")}
              </p>
              <div className="grid gap-2">
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => demoLogin("buyer")} data-testid="demo-buyer">
                  <ShoppingBag className="h-3.5 w-3.5" /> {t("demoBuyer")}
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => demoLogin("seller")} data-testid="demo-seller">
                  <Paintbrush className="h-3.5 w-3.5" /> {t("demoSeller")}
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => demoLogin("admin")} data-testid="demo-admin">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t("demoAdmin")}
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("demoNote")}</p>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("noAccount")}{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  {t("register")}
                </Link>
              </>
            ) : (
              <>
                {t("hasAccount")}{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  {t("login")}
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
