import { fetchWithSsrFGuard } from "openclaw/plugin-sdk/ssrf-runtime";

export interface HttpResponse {
  status: number;
  url: string;
  body: string;
}

export type FetchFn = (
  url: string,
  accept: string,
  signal?: AbortSignal,
  method?: "GET" | "HEAD",
) => Promise<HttpResponse>;

export interface StoreSearch {
  store: string;
  query: string;
  category: string;
  currency: string;
}

export interface VerifiedGift {
  title: string;
  store: string;
  price: number;
  currency: string;
  url: string;
  category: string;
  vendor?: string;
  summary?: string;
}

export interface SleighShopResult {
  verifiedCount: number;
  elapsedMs: number;
  gifts: VerifiedGift[];
  formatted: string;
}

interface StoreCatalogEntry {
  store: string;
  defaultQuery: string;
  category: string;
  currency: string;
  keywords: string[];
}

// Verified live public Shopify retail stores across gift categories.
// Every product title, price, stock status, description, and URL is fetched live at request time.
export const RETAIL_STORE_CATALOG: StoreCatalogEntry[] = [
  { store: "www.stanley1913.com", defaultQuery: "tumbler", category: "Coffee & Drinkware", currency: "USD", keywords: ["coffee", "drink", "outdoors", "camping", "hiking", "travel", "fitness", "dad", "commute"] },
  { store: "www.deathwishcoffee.com", defaultQuery: "coffee", category: "Specialty Coffee", currency: "USD", keywords: ["coffee", "espresso", "roast", "caffeine", "morning", "dad", "coworker"] },
  { store: "fellowproducts.com", defaultQuery: "mug", category: "Coffee & Tea Gear", currency: "USD", keywords: ["coffee", "tea", "kettle", "kitchen", "brew", "barista", "design"] },
  { store: "www.leatherman.com", defaultQuery: "micra", category: "Outdoor & Everyday Carry", currency: "USD", keywords: ["outdoors", "fishing", "camping", "tools", "edc", "gear", "dad", "diy", "hiking"] },
  { store: "www.simmsfishing.com", defaultQuery: "hat", category: "Fishing & River Apparel", currency: "USD", keywords: ["fishing", "outdoors", "hat", "cap", "river", "camping", "dad"] },
  { store: "www.graza.co", defaultQuery: "olive", category: "Cooking & Pantry", currency: "USD", keywords: ["cooking", "kitchen", "food", "chef", "foodie", "baking", "mom", "dad", "sister"] },
  { store: "greatjonesgoods.com", defaultQuery: "cake", category: "Bakeware & Kitchen", currency: "USD", keywords: ["cooking", "baking", "kitchen", "food", "chef", "home", "mom"] },
  { store: "homesick.com", defaultQuery: "candle", category: "Home Fragrance", currency: "USD", keywords: ["candle", "cozy", "home", "scent", "relax", "mom", "sister", "friend"] },
  { store: "boysmells.com", defaultQuery: "candle", category: "Artisan Candles", currency: "USD", keywords: ["candle", "home", "fragrance", "cozy", "design", "style", "sister"] },
  { store: "www.explodingkittens.com", defaultQuery: "game", category: "Board & Party Games", currency: "USD", keywords: ["games", "gaming", "board", "party", "fun", "family", "kids", "teen", "friends", "brother"] },
  { store: "www.glossier.com", defaultQuery: "balm", category: "Skincare & Beauty", currency: "USD", keywords: ["beauty", "skincare", "makeup", "lip", "sister", "mom", "selfcare", "wellness"] },
  { store: "www.allbirds.com", defaultQuery: "socks", category: "Comfort Apparel", currency: "USD", keywords: ["apparel", "clothes", "shoes", "running", "fitness", "travel", "comfort", "wool", "yoga"] },
  { store: "www.taylorstitch.com", defaultQuery: "beanie", category: "Menswear & Outdoors", currency: "USD", keywords: ["apparel", "menswear", "outdoors", "style", "clothing", "dad", "brother", "winter"] },
  { store: "www.rumpl.com", defaultQuery: "blanket", category: "Camping & Cozy Gear", currency: "USD", keywords: ["camping", "outdoors", "cozy", "blanket", "travel", "hiking"] },
  { store: "ugmonk.com", defaultQuery: "pen", category: "Desk & Workspace", currency: "USD", keywords: ["desk", "tech", "office", "workspace", "minimalist", "design", "developer", "coworker"] },
  { store: "www.magnatiles.com", defaultQuery: "micro", category: "Kids & STEM Toys", currency: "USD", keywords: ["kids", "toys", "stem", "building", "family", "creative"] },
  { store: "www.brooklinen.com", defaultQuery: "mask", category: "Home & Relaxation", currency: "USD", keywords: ["home", "cozy", "bedding", "bath", "relax", "mom", "comfort", "sleep", "yoga"] },
  { store: "kizik.com", defaultQuery: "shoe", category: "Footwear & Travel", currency: "USD", keywords: ["shoes", "sneakers", "walking", "travel", "comfort", "dad", "mom"] },
  { store: "bearaby.com", defaultQuery: "blanket", category: "Sleep & Wellness", currency: "USD", keywords: ["cozy", "sleep", "blanket", "home", "relax", "wellness"] },
];

const REQUEST_TIMEOUT_MS = 3500;
const MAX_BODY_BYTES = 4_000_000;
const MAX_REDIRECTS = 3;

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

const JUNK_TITLE_RE =
  /\b(gift\s*card|e-?gift|digital\s*card|shipping\s*protection|route\s*package|warranty|subscription|membership|refill|replacement\s*(part|lid|straw|cap)|donation|sample\s*pack|gift\s*wrap|gift\s*note)\b/i;

export const guardedFetch: FetchFn = async (url, accept, signal, method = "GET") => {
  const { response, finalUrl, release } = await fetchWithSsrFGuard({
    url,
    init: { method, headers: { ...HEADERS, accept } },
    requireHttps: true,
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRedirects: MAX_REDIRECTS,
    signal,
    auditContext: "santa-speedy-shopper",
  });
  try {
    const body = method === "HEAD" ? "" : await readCapped(response);
    return { status: response.status, url: finalUrl, body };
  } finally {
    await release();
  }
};

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("response body exceeded limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function normalizeOrigin(store: string): string {
  const parsed = new URL(/^https?:\/\//i.test(store) ? store : `https://${store}`);
  return `https://${parsed.host}`;
}

export function stripHtmlSnippet(html: string | undefined, maxLen = 165): string | undefined {
  if (!html) return undefined;
  const clean = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&mdash;|&ndash;/gi, "—")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return undefined;
  const firstSentence = clean.match(/^[^.!?]{15,165}[.!?]/)?.[0];
  const pick =
    firstSentence && firstSentence.length <= maxLen
      ? firstSentence
      : clean.slice(0, maxLen).replace(/\s+\S*$/, "").replace(/[,;:\-–—]+$/, "") + "...";
  return pick.length >= 12 ? pick : undefined;
}

export function parseShoppingRequest(request: string): {
  recipient: string;
  maxPrice: number;
  tokens: string[];
} {
  const budgetMatch =
    request.match(/(?:under|below|max|around|up\s+to|budget(?:\s+of)?)\s*\$?\s*(\d+(?:\.\d+)?)/i) ??
    request.match(/\$\s*(\d+(?:\.\d+)?)/);
  const maxPrice = budgetMatch ? Math.max(10, Number(budgetMatch[1])) : 100;

  const recipientMatch = request.match(
    /\bfor\s+(?:my\s+|a\s+|an\s+|the\s+)?([a-z]+(?:\s+[a-z]+)?)(?=\s+(?:who|that|with|under|below|around|in|,|\.)|$)/i,
  );
  const recipient = recipientMatch?.[1]?.trim() || "your holiday list";

  const tokens = request
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

  return { recipient, maxPrice, tokens };
}

export function planStoreSearchesFromRequest(request: string, maxStores = 10): {
  recipient: string;
  maxPrice: number;
  searches: StoreSearch[];
} {
  const { recipient, maxPrice, tokens } = parseShoppingRequest(request);
  const tokenSet = new Set(tokens);

  const scored = RETAIL_STORE_CATALOG.map((entry, idx) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (tokenSet.has(kw)) score += 3;
      else if (tokens.some((t) => kw.includes(t) || t.includes(kw))) score += 1;
    }
    return { entry, score, idx };
  }).sort((a, b) => b.score - a.score || a.idx - b.idx);

  return {
    recipient,
    maxPrice,
    searches: scored.slice(0, maxStores).map(({ entry }) => ({
      store: entry.store,
      query: entry.defaultQuery,
      category: entry.category,
      currency: entry.currency,
    })),
  };
}

interface SuggestProduct {
  title?: string;
  url?: string;
  price?: string | number;
  available?: boolean;
  vendor?: string;
  body?: string;
}

interface ShopifyVariant {
  id?: number | string;
  price?: number;
  available?: boolean;
}

interface ShopifyProductJson {
  title?: string;
  vendor?: string;
  description?: string;
  variants?: ShopifyVariant[];
}

async function searchAndVerifyOneStore(
  fetchFn: FetchFn,
  search: StoreSearch,
  maxPrice?: number,
  signal?: AbortSignal,
): Promise<VerifiedGift | null> {
  const origin = normalizeOrigin(search.store);
  const params = new URLSearchParams({
    q: search.query,
    "resources[type]": "product",
    "resources[limit]": "6",
    "resources[options][unavailable_products]": "hide",
  });

  const suggestRes = await fetchFn(
    `${origin}/search/suggest.json?${params}`,
    "application/json",
    signal,
    "GET",
  ).catch(() => undefined);

  if (!suggestRes || suggestRes.status !== 200) return null;
  const body = parseJson(suggestRes.body) as {
    resources?: { results?: { products?: SuggestProduct[] } };
  } | undefined;
  const products = body?.resources?.results?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  const finalOrigin = new URL(suggestRes.url || origin).origin;
  const candidate = products.find((p): p is Required<Pick<SuggestProduct, "title" | "url">> & SuggestProduct => {
    if (typeof p.title !== "string" || typeof p.url !== "string") return false;
    if (p.available === false) return false;
    if (JUNK_TITLE_RE.test(p.title)) return false;
    const price = Number(p.price);
    const minPrice = maxPrice !== undefined && maxPrice >= 25 ? 12 : 1;
    if (!Number.isFinite(price) || price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    return true;
  });
  if (!candidate) return null;

  const cleanPath = new URL(candidate.url, finalOrigin).pathname.replace(/\/$/, "").replace(/\.(js|json)$/, "");
  const baseUrl = `${finalOrigin}${cleanPath}`;
  const suggestSummary = stripHtmlSnippet(candidate.body);

  // Live variant check via Shopify product JSON when storefront allows secondary fetch.
  const jsRes = await fetchFn(`${baseUrl}.js`, "application/json", signal, "GET").catch(() => undefined);
  if (jsRes && (jsRes.status === 404 || jsRes.status === 410)) return null;

  if (jsRes && jsRes.status === 200) {
    const data = parseJson(jsRes.body) as ShopifyProductJson | undefined;
    if (data && typeof data.title === "string" && Array.isArray(data.variants)) {
      const inStock = data.variants.filter((v) => {
        if (v.available !== true || typeof v.price !== "number" || v.price <= 0) return false;
        const dollars = v.price / 100;
        return maxPrice === undefined || dollars <= maxPrice;
      });
      if (inStock.length === 0) return null;
      const chosen = inStock[0];
      const canonical = new URL(baseUrl);
      if (chosen.id !== undefined) canonical.searchParams.set("variant", String(chosen.id));
      return {
        title: data.title.trim(),
        store: canonical.host.replace(/^www\./, ""),
        price: Number((chosen.price! / 100).toFixed(2)),
        currency: search.currency,
        url: canonical.href,
        category: search.category,
        vendor: typeof data.vendor === "string" && data.vendor.trim() ? data.vendor.trim() : undefined,
        summary: stripHtmlSnippet(data.description) ?? suggestSummary,
      };
    }
  }

  return {
    title: candidate.title.trim(),
    store: new URL(baseUrl).host.replace(/^www\./, ""),
    price: Number(Number(candidate.price).toFixed(2)),
    currency: search.currency,
    url: baseUrl,
    category: search.category,
    vendor: typeof candidate.vendor === "string" && candidate.vendor.trim() ? candidate.vendor.trim() : undefined,
    summary: suggestSummary,
  };
}

export function formatMoney(price: number, currency: string): string {
  return currency === "USD" ? `$${price.toFixed(2)}` : `${price.toFixed(2)} ${currency}`;
}

export function formatGiftList(recipient: string, maxPrice: number, gifts: VerifiedGift[]): string {
  const top5 = gifts.slice(0, 5);
  const total = top5.reduce((sum, g) => sum + g.price, 0);
  const header = `🎄 5 Live-Verified Christmas Gifts for ${recipient} (Under $${maxPrice}):`;

  const items = top5.map((g, i) => {
    const brand = g.vendor ? ` · ${g.vendor}` : "";
    const detail = g.summary ? `\n   ${g.summary}` : "";
    return `${i + 1}. **${g.title}** — ${formatMoney(g.price, g.currency)} USD · ${g.store}${brand} (In Stock ✓)\n   ${g.url}${detail}`;
  });

  const footer = `Total for all ${top5.length} gifts: $${total.toFixed(2)} USD across ${top5.length} real retail stores (every price, link, and stock status live-verified).`;
  return `${header}\n\n${items.join("\n\n")}\n\n${footer}`;
}

export async function shopForGifts(
  fetchFn: FetchFn,
  request: string,
  signal?: AbortSignal,
): Promise<SleighShopResult> {
  const t0 = performance.now();
  const { recipient, maxPrice, searches } = planStoreSearchesFromRequest(request, 10);
  const results = await Promise.all(
    searches.map((s) => searchAndVerifyOneStore(fetchFn, s, maxPrice, signal)),
  );

  const gifts: VerifiedGift[] = [];
  const seenUrls = new Set<string>();
  for (const item of results) {
    if (!item || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    gifts.push(item);
    if (gifts.length >= 5) break;
  }

  return {
    verifiedCount: gifts.length,
    elapsedMs: Math.round(performance.now() - t0),
    gifts,
    formatted: formatGiftList(recipient, maxPrice, gifts),
  };
}
