import { describe, expect, it } from "vitest";
import {
  cleanHtmlText,
  matchesSearchTerm,
  parseBudget,
  parseShoppingRequest,
  planStoreSearches,
  searchShopifyStore,
  shopForGifts,
  type FetchFn,
} from "./storefront.js";

function makeFakeStore(fixtures: Record<string, { status?: number; url?: string; body: string }>): FetchFn {
  return async (url, _accept, _signal, method = "GET") => {
    const hit = fixtures[url];
    if (!hit) return { status: 404, url, body: "" };
    return { status: hit.status ?? 200, url: hit.url ?? url, body: method === "HEAD" ? "" : hit.body };
  };
}

describe("santa-speedy-shopper storefront", () => {
  it("parses budget edge cases accurately without silent clamping", () => {
    expect(parseBudget("under $1,000")).toBe(1000);
    expect(parseBudget("under $5")).toBe(5);
    expect(parseBudget("less than 30 dollars")).toBe(30);
    expect(parseBudget("$45 or less")).toBe(45);
    expect(parseBudget("up to $1,250.50")).toBe(1250.5);
    expect(parseBudget("Find 5 gifts for my aunt who loves violin")).toBeUndefined();
  });

  it("excludes family/recipient words like aunt/niece from search terms and strips timestamps", () => {
    const parsed = parseShoppingRequest(
      "[Sun 2026-11-22 12:48 GMT+5:30] Find 5 real Christmas gifts for my aunt who loves violin under $60.",
    );
    expect(parsed.recipient).toBe("aunt");
    expect(parsed.maxPrice).toBe(60);
    expect(parsed.interestTerms).toEqual(["violin"]);
    expect(parsed.interestTerms).not.toContain("aunt");

    const plan = planStoreSearches({ request: "gifts for my aunt who loves violin under $60" }, 6);
    expect(plan.queries).toEqual(["violin"]);
    expect(plan.searches.every((s) => s.query === "violin")).toBe(true);
    expect(plan.searches.map((s) => s.store)).toContain("www.sharmusic.com");
  });

  it("rejects fuzzy search mismatches like Shrinking Violet, Illinois Puzzle, and House of Astrology", () => {
    expect(matchesSearchTerm({ title: "Shrinking Violet", body: "A cozy mystery novel" }, "violin")).toBe(false);
    expect(matchesSearchTerm({ title: "Illinois Mini Shaped Puzzle", body: "State jigsaw puzzle" }, "violin")).toBe(false);
    expect(matchesSearchTerm({ title: "Pickleball Cooling Towel", body: "Outdoor sports towel" }, "violin")).toBe(false);
    expect(matchesSearchTerm({ title: "House of Astrology 500 Piece Puzzle" }, "horse")).toBe(false);

    expect(matchesSearchTerm({ title: 'Soft Violin 16"', type: "Plush" }, "violin")).toBe(true);
    expect(matchesSearchTerm({ title: "Solo Pieces for the Beginning Violinist", type: "Sheet Music" }, "violin")).toBe(true);
    expect(matchesSearchTerm({ title: "The Wild Horse Effect" }, "horses")).toBe(true);
    expect(matchesSearchTerm({ title: "Astronomy A5 Softcover Notebook" }, "astronomy")).toBe(true);
  });

  it("requires explicit available === true (rejects null, undefined, and false)", async () => {
    const fake = makeFakeStore({
      "https://www.stanley1913.com/search/suggest.json?q=coffee&resources%5Btype%5D=product&resources%5Blimit%5D=8&resources%5Boptions%5D%5Bunavailable_products%5D=hide": {
        url: "https://www.stanley1913.com/search/suggest.json",
        body: JSON.stringify({
          resources: {
            results: {
              products: [
                { title: "Coffee Mug Undefined Stock", url: "/products/u", price: "24.00" },
                { title: "Coffee Mug Null Stock", url: "/products/n", price: "24.00", available: null },
                { title: "Coffee Mug Sold Out", url: "/products/f", price: "24.00", available: false },
                { title: "Coffee Digital Gift Card", url: "/products/gc", price: "25.00", available: true },
                { title: "Classic Coffee French Press", url: "/products/fp", price: "28.00", available: true, vendor: "Stanley" },
              ],
            },
          },
        }),
      },
    });

    const hits = await searchShopifyStore(
      fake,
      { store: "www.stanley1913.com", query: "coffee", category: "Coffee & Drinkware", currency: "USD" },
      60,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("Classic Coffee French Press");
    expect(hits[0].stockVerified).toBe(true);
  });

  it("fails honestly when fewer than 5 matching in-stock gifts are found", async () => {
    const fake = makeFakeStore({
      "https://www.sharmusic.com/search/suggest.json?q=violin&resources%5Btype%5D=product&resources%5Blimit%5D=8&resources%5Boptions%5D%5Bunavailable_products%5D=hide": {
        url: "https://www.sharmusic.com/search/suggest.json",
        body: JSON.stringify({
          resources: {
            results: {
              products: [
                { title: "Solo Pieces for the Beginning Violinist", url: "/products/solo-violin", price: "17.25", available: true, vendor: "Shar Music" },
              ],
            },
          },
        }),
      },
    });

    const result = await shopForGifts(fake, { queries: ["violin"], maxPrice: 60, recipient: "aunt" });
    expect(result.ok).toBe(false);
    expect(result.verifiedCount).toBe(1);
    expect(result.formatted).toContain("Unable to find 5 matching in-stock Christmas gifts");
    expect(result.formatted).not.toContain("5 In-Stock Christmas Gifts");
    expect(result.formatted).not.toContain("Total for all 5 gifts");
  });

  it("decodes named, decimal, and hex HTML entities cleanly", () => {
    expect(cleanHtmlText("Face &#38; Skin Care 8.5&#34; Kit - Brand&#8482; &#x27;Holiday&#x27;")).toBe(
      `Face & Skin Care 8.5" Kit - Brand™ 'Holiday'`,
    );
  });
});
