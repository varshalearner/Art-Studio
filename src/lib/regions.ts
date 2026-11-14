import type { ShippingRegion } from "@/types";

export const SHIPPING_REGIONS: { value: ShippingRegion; label: string }[] = [
  { value: "india", label: "India" },
  { value: "asia", label: "Asia (excl. India)" },
  { value: "europe", label: "Europe" },
  { value: "north_america", label: "North America" },
  { value: "rest_of_world", label: "Rest of world" },
];

export function regionLabel(region: ShippingRegion): string {
  return SHIPPING_REGIONS.find((r) => r.value === region)?.label ?? region;
}

/** Map a country name to a shipping region (small demo-friendly mapping). */
export function countryToRegion(country: string): ShippingRegion {
  const c = country.toLowerCase().trim();
  if (c === "india" || c === "in") return "india";
  const asia = ["japan", "china", "singapore", "thailand", "vietnam", "indonesia", "malaysia", "south korea", "korea", "philippines", "sri lanka", "nepal", "bangladesh", "uae", "united arab emirates", "israel", "saudi arabia"];
  if (asia.some((x) => c.includes(x))) return "asia";
  const europe = ["united kingdom", "uk", "england", "france", "germany", "spain", "italy", "netherlands", "belgium", "austria", "switzerland", "sweden", "norway", "denmark", "finland", "poland", "portugal", "ireland", "greece", "czech"];
  if (europe.some((x) => c.includes(x))) return "europe";
  const na = ["united states", "usa", "us", "canada", "mexico"];
  if (na.some((x) => c === x || c.includes(x))) return "north_america";
  return "rest_of_world";
}

/** Default shipping rates in INR a new seller starts with. */
export const DEFAULT_SHIPPING_RATES: { region: ShippingRegion; rateInr: number }[] = [
  { region: "india", rateInr: 150 },
  { region: "asia", rateInr: 1200 },
  { region: "europe", rateInr: 2000 },
  { region: "north_america", rateInr: 2200 },
  { region: "rest_of_world", rateInr: 2500 },
];
