"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AccountShell } from "@/components/account/account-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CURRENCIES } from "@/lib/currency";
import type { Currency } from "@/types";

export function SettingsContent() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { theme, setTheme } = useTheme();

  if (!user) return <AccountShell>{null}</AccountShell>;

  const changeLocale = (next: string) => {
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };

  return (
    <AccountShell title={t("settings")}>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="s-lang">{t("language")}</Label>
            <Select id="s-lang" className="mt-1" value={locale} onChange={(e) => changeLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="s-currency">{t("currency")}</Label>
            <Select
              id="s-currency"
              className="mt-1"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Prices are stored in INR and converted with daily exchange rates.
            </p>
          </div>
          <div>
            <Label>Theme</Label>
            <div className="mt-2 flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" /> {t("lightMode")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" /> {t("darkMode")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AccountShell>
  );
}
