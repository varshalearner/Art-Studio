"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Currency } from "@/types";
import {
  CURRENCIES,
  FALLBACK_RATES,
  detectCurrency,
  formatMoney,
  convertFromInr,
} from "@/lib/currency";
import { siteConfig } from "@/config";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format an INR base price in the visitor's currency. */
  format: (amountInr: number) => string;
  convert: (amountInr: number) => number;
  rates: Record<Currency, number>;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: siteConfig.defaultCurrency,
  setCurrency: () => {},
  format: (v) => `₹${v}`,
  convert: (v) => v,
  rates: FALLBACK_RATES,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(siteConfig.defaultCurrency);
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);

  useEffect(() => {
    // manual choice (saved) wins over location auto-detection
    try {
      const saved = window.localStorage.getItem("aes_currency") as Currency | null;
      if (saved && CURRENCIES.includes(saved)) {
        setCurrencyState(saved);
      } else {
        setCurrencyState(detectCurrency());
      }
    } catch {
      /* keep default */
    }
    // live rates (cached server-side for 24h); fallback silently on error
    fetch("/api/exchange-rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => undefined);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      window.localStorage.setItem("aes_currency", c);
    } catch {
      /* noop */
    }
  }, []);

  const format = useCallback(
    (amountInr: number) => formatMoney(amountInr, currency, rates),
    [currency, rates]
  );
  const convert = useCallback(
    (amountInr: number) => convertFromInr(amountInr, currency, rates),
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, convert, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
