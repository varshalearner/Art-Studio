"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

/** GDPR cookie consent banner. The choice is stored locally. */
export function CookieConsent() {
  const t = useTranslations("cookie");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("aes_cookie_consent")) setVisible(true);
    } catch {
      /* storage blocked: skip the banner rather than loop */
    }
  }, []);

  const choose = (value: "all" | "essential") => {
    try {
      window.localStorage.setItem("aes_cookie_consent", value);
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-lg border bg-card p-4 shadow-lifted sm:left-auto sm:right-6"
    >
      <div className="flex gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-mustard-dark" aria-hidden />
        <div className="space-y-3">
          <p className="text-sm">{t("text")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => choose("all")}>
              {t("accept")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => choose("essential")}>
              {t("essential")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
