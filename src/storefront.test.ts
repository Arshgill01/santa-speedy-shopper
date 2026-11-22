import { describe, expect, it } from "vitest";
import { parseShoppingRequest, planStoreSearchesFromRequest, shopForGifts, type FetchFn } from "./storefront.js";

function makeFakeStore(fixtures: Record<string, { status?: number; url?: string; body: string }>): FetchFn {
  return async (url, _accept, _signal, method = "GET") => {
    const hit = fixtures[url];
    if (!hit) return { status: 404, url, body: "" };
    return { status: hit.status ?? 200, url: hit.url ?? url, body: method === "HEAD" ? "" : hit.body };
  };
}

describe("santa-speedy-shopper storefront", () => {
  it("parses recipient, budget, and interest tokens from natural language", () => {
    const parsed = parseShoppingRequest("Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under $60.");
    expect(parsed.recipient).toBe("dad");
    expect(parsed.maxPrice).toBe(60);
    expect(parsed.tokens).toContain("coffee");
    expect(parsed.tokens).toContain("fishing");
  });

  it("routes diverse personas to matching retail stores", () => {
    const dadPlan = planStoreSearchesFromRequest("gifts for my dad who loves coffee and fishing under $60", 5);
    expect(dadPlan.searches.map((p) => p.store)).toContain("www.stanley1913.com");
    expect(dadPlan.searches.map((p) => p.store)).toContain("www.deathwishcoffee.com");

    const sisterPlan = planStoreSearchesFromRequest("5 gifts for my sister who loves skincare, candles, and cozy home goods under $50", 5);
    expect(sisterPlan.searches.map((p) => p.store)).toContain("homesick.com");
    expect(sisterPlan.searches.map((p) => p.store)).toContain("www.glossier.com");
  });

  it("filters junk items, sold-out variants, and over-budget items and returns verified variant URL + summary table", async () => {
    const fake = makeFakeStore({
      "https://www.stanley1913.com/search/suggest.json?q=tumbler&resources%5Btype%5D=product&resources%5Blimit%5D=6&resources%5Boptions%5D%5Bunavailable_products%5D=hide": {
        url: "https://www.stanley1913.com/search/suggest.json",
        body: JSON.stringify({
          resources: {
            results: {
              products: [
                { title: "Digital Gift Card", url: "/products/gift-card", price: "25.00", available: true },
                { title: "Too Expensive Cooler", url: "/products/cooler", price: "250.00", available: true },
                { title: "Classic Camp Mug", url: "/products/camp-mug", price: "24.00", available: true, body: "<p>Double-wall stainless steel mug built for hot coffee.</p>" },
              ],
            },
          },
        }),
      },
      "https://www.stanley1913.com/products/camp-mug.js": {
        body: JSON.stringify({
          title: "Classic Camp Mug",
          vendor: "Stanley",
          variants: [
            { id: 111, price: 2400, available: false },
            { id: 222, price: 2400, available: true },
          ],
        }),
      },
    });

    const result = await shopForGifts(fake, "Find 5 gifts for my dad who loves coffee under $60");
    expect(result.verifiedCount).toBe(1);
    expect(result.formatted).toContain("https://www.stanley1913.com/products/camp-mug?variant=222");
    expect(result.formatted).toContain("Double-wall stainless steel mug built for hot coffee.");
    expect(result.formatted).toContain("live-verified");
  });
});
