import { describe, expect, it } from "vitest";
import { slugify, sizeBucket, sizeLabel } from "@/lib/utils";
import { convertFromInr, formatMoney, FALLBACK_RATES } from "@/lib/currency";
import { countryToRegion } from "@/lib/regions";

describe("utils", () => {
  it("slugify produces clean url slugs", () => {
    expect(slugify("Haveli at Dusk!")).toBe("haveli-at-dusk");
    expect(slugify("  Café   Noir  ")).toBe("caf-noir");
    expect(slugify("")).toBe("artwork");
  });

  it("sizeBucket classifies artwork sizes", () => {
    expect(sizeBucket(20, 30)).toBe("small");
    expect(sizeBucket(50, 60)).toBe("medium");
    expect(sizeBucket(80, 100)).toBe("large");
  });

  it("sizeLabel formats dimensions", () => {
    expect(sizeLabel(30, 40)).toBe("30 × 40 cm");
  });
});

describe("currency", () => {
  it("converts INR base prices", () => {
    expect(convertFromInr(8400, "USD", FALLBACK_RATES)).toBe(100);
    expect(convertFromInr(1000, "INR", FALLBACK_RATES)).toBe(1000);
  });

  it("formats money with the right symbol", () => {
    expect(formatMoney(1000, "INR", FALLBACK_RATES)).toContain("₹");
    expect(formatMoney(8400, "USD", FALLBACK_RATES)).toContain("$");
  });
});

describe("regions", () => {
  it("maps countries to shipping regions", () => {
    expect(countryToRegion("India")).toBe("india");
    expect(countryToRegion("Germany")).toBe("europe");
    expect(countryToRegion("United States")).toBe("north_america");
    expect(countryToRegion("Japan")).toBe("asia");
    expect(countryToRegion("Brazil")).toBe("rest_of_world");
  });
});
