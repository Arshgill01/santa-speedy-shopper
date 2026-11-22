import { fetchWithSsrFGuard } from "openclaw/plugin-sdk/ssrf-runtime";

export interface StoreCatalogEntry {
  store: string;
  category: string;
  currency: string;
  keywords: string[];
  broad?: boolean;
}

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
  matchedQuery: string;
  stockVerified: boolean;
  vendor?: string;
  summary?: string;
}

export interface ShopInput {
  queries?: string[];
  maxPrice?: number;
  recipient?: string;
  request?: string;
}

export interface SleighShopResult {
  ok: boolean;
  verifiedCount: number;
  elapsedMs: number;
  gifts: VerifiedGift[];
  formatted: string;
}

export type FetchResult = {
  status: number;
  url: string;
  body: string;
};

export type FetchFn = (
  url: string,
  accept: string,
  signal?: AbortSignal,
  method?: "GET" | "HEAD",
) => Promise<FetchResult>;

// Public Shopify storefronts supporting Shopify's documented Predictive Search API
// (/search/suggest.json?resources[type]=product&resources[options][unavailable_products]=hide).
// No API keys or undocumented third-party endpoints are used.
export const RETAIL_STORE_CATALOG: StoreCatalogEntry[] = [
  // Broad multi-topic gift, book, museum, stationery & art storefronts (cover unseen hobbies)
  { store: "www.chroniclebooks.com", category: "Books, Puzzles & Gifts", currency: "USD", broad: true, keywords: ["book", "books", "reading", "puzzle", "art", "music", "violin", "horse", "horses", "astronomy", "space", "cooking", "baking", "coffee", "dog", "dogs", "cat", "garden", "photography", "nature", "science", "game", "games"] },
  { store: "www.papersource.com", category: "Gifts, Stationery & Hobbies", currency: "USD", broad: true, keywords: ["stationery", "desk", "notebook", "journal", "planner", "candle", "puzzle", "game", "music", "violin", "horse", "horses", "astronomy", "cooking", "baking", "coffee", "tea", "cozy", "dog", "cat", "art", "craft"] },
  { store: "www.popchart.co", category: "Art Prints & Posters", currency: "USD", broad: true, keywords: ["art", "poster", "print", "horse", "horses", "astronomy", "space", "stars", "coffee", "music", "dog", "dogs", "book", "books", "baseball", "football", "fishing", "cooking", "beer", "wine", "film", "movie", "science"] },
  { store: "kikkerland.com", category: "Clever Gifts & Gadgets", currency: "USD", broad: true, keywords: ["gadget", "gadgets", "desk", "office", "game", "games", "puzzle", "fishing", "coffee", "tea", "cooking", "astronomy", "space", "camping", "music", "dog", "cat", "travel", "tool", "tools"] },
  { store: "www.bando.com", category: "Lifestyle & Cozy Gifts", currency: "USD", broad: true, keywords: ["cozy", "blanket", "mug", "notebook", "planner", "desk", "candle", "wellness", "horse", "horses", "astrology", "astronomy", "bag", "tote", "water", "bottle"] },
  { store: "www.riflepaperco.com", category: "Stationery & Desk", currency: "USD", broad: true, keywords: ["stationery", "notebook", "journal", "desk", "office", "planner", "art", "floral", "mug", "candle", "book", "puzzle"] },
  { store: "www.eeboo.com", category: "Puzzles, Art & Games", currency: "USD", broad: true, keywords: ["puzzle", "puzzles", "game", "games", "board", "art", "drawing", "sketchbook", "planets", "astronomy", "space", "nature", "music", "horse", "horses", "kids"] },

  // Music, science & equestrian specialty stores
  { store: "www.sharmusic.com", category: "Strings & Classical Music", currency: "USD", keywords: ["violin", "viola", "cello", "strings", "music", "musician", "classical", "orchestra", "rosin", "bow", "sheet"] },
  { store: "shop.amnh.org", category: "Natural History & Science", currency: "USD", keywords: ["astronomy", "space", "universe", "stars", "planets", "telescope", "science", "dinosaur", "nature", "earth", "geology", "biology", "ocean", "museum"] },
  { store: "www.cognitive-surplus.com", category: "Science & STEM Gifts", currency: "USD", keywords: ["astronomy", "space", "stars", "science", "chemistry", "physics", "biology", "math", "engineering", "coding", "notebook", "mug", "stem"] },
  { store: "www.doversaddlery.com", category: "Equestrian & Horse Gear", currency: "USD", keywords: ["horse", "horses", "equestrian", "riding", "saddle", "barn", "pony", "stable"] },

  // Coffee, tea & drinkware
  { store: "www.stanley1913.com", category: "Coffee & Drinkware", currency: "USD", keywords: ["coffee", "tumbler", "mug", "bottle", "drinkware", "camping", "hiking", "outdoors", "travel", "fitness"] },
  { store: "www.deathwishcoffee.com", category: "Specialty Coffee", currency: "USD", keywords: ["coffee", "espresso", "roast", "beans", "caffeine", "mug"] },
  { store: "fellowproducts.com", category: "Coffee & Tea Gear", currency: "USD", keywords: ["coffee", "tea", "kettle", "mug", "brew", "espresso", "pour", "barista", "kitchen"] },

  // Fishing, outdoors, camping & everyday carry
  { store: "www.leatherman.com", category: "Outdoor & Multi-Tools", currency: "USD", keywords: ["fishing", "camping", "outdoors", "outdoor", "tool", "tools", "multitool", "knife", "edc", "hiking", "diy"] },
  { store: "www.simmsfishing.com", category: "Fishing & River Gear", currency: "USD", keywords: ["fishing", "angler", "fly", "river", "hat", "cap", "outdoors", "outdoor", "camping"] },
  { store: "barebonesliving.com", category: "Outdoor & Camp Cooking", currency: "USD", keywords: ["camping", "camp", "lantern", "grill", "cooking", "skillet", "garden", "gardening", "outdoors", "outdoor", "hiking"] },
  { store: "www.cotopaxi.com", category: "Outdoor & Adventure Gear", currency: "USD", keywords: ["camping", "camp", "hiking", "hike", "travel", "backpack", "bag", "pack", "outdoors", "outdoor", "adventure"] },
  { store: "www.rumpl.com", category: "Camping & Cozy Blankets", currency: "USD", keywords: ["camping", "camp", "blanket", "outdoors", "outdoor", "cozy", "travel", "hiking"] },

  // Cooking, baking & kitchen
  { store: "www.graza.co", category: "Cooking & Pantry", currency: "USD", keywords: ["cooking", "cook", "olive", "oil", "kitchen", "chef", "food", "foodie", "pantry", "baking"] },
  { store: "greatjonesgoods.com", category: "Bakeware & Kitchen", currency: "USD", keywords: ["baking", "bake", "bakeware", "cooking", "cook", "kitchen", "cake", "pan", "chef", "food"] },

  // Tech, keyboards, photography, desk & board games
  { store: "www.keychron.com", category: "Mechanical Keyboards & Desk", currency: "USD", keywords: ["keyboard", "keyboards", "keycap", "keycaps", "mechanical", "gaming", "gamer", "desk", "tech", "coding", "developer", "pc", "mouse"] },
  { store: "peakdesign.com", category: "Camera & Travel Gear", currency: "USD", keywords: ["camera", "photo", "photography", "strap", "pouch", "tripod", "travel", "bag", "tech", "creator"] },
  { store: "ugmonk.com", category: "Desk & Workspace", currency: "USD", keywords: ["desk", "workspace", "office", "pen", "organizer", "minimalist", "tech", "design", "developer"] },
  { store: "www.explodingkittens.com", category: "Board & Party Games", currency: "USD", keywords: ["game", "games", "board", "card", "party", "gaming", "puzzle", "family"] },
  { store: "www.magnatiles.com", category: "Kids & STEM Toys", currency: "USD", keywords: ["kids", "toys", "toy", "stem", "building", "magnetic", "blocks"] },

  // Pets
  { store: "wildone.com", category: "Dog & Pet Gear", currency: "USD", keywords: ["dog", "dogs", "puppy", "pet", "pets", "leash", "collar", "harness", "treat", "toy"] },

  // Home, candles, beauty, wellness & apparel
  { store: "homesick.com", category: "Home Fragrance", currency: "USD", keywords: ["candle", "candles", "scent", "fragrance", "cozy", "home", "relax", "reed", "diffuser"] },
  { store: "boysmells.com", category: "Artisan Candles", currency: "USD", keywords: ["candle", "candles", "fragrance", "perfume", "home", "cozy", "scent"] },
  { store: "www.glossier.com", category: "Skincare & Beauty", currency: "USD", keywords: ["skincare", "beauty", "balm", "lip", "makeup", "cleanser", "serum", "cream", "wellness", "selfcare"] },
  { store: "www.brooklinen.com", category: "Home & Relaxation", currency: "USD", keywords: ["cozy", "home", "bedding", "towel", "bath", "robe", "pillow", "mask", "sleep", "relax", "comfort"] },
  { store: "www.allbirds.com", category: "Comfort Apparel", currency: "USD", keywords: ["socks", "shoes", "sneakers", "running", "runner", "fitness", "wool", "apparel", "travel", "comfort"] },
  { store: "www.taylorstitch.com", category: "Menswear & Outdoors", currency: "USD", keywords: ["beanie", "apparel", "menswear", "shirt", "jacket", "winter", "clothing", "outdoors", "style"] },
  { store: "bearaby.com", category: "Sleep & Wellness", currency: "USD", keywords: ["blanket", "weighted", "sleep", "cozy", "relax", "wellness", "home", "nap"] },
];

const REQUEST_TIMEOUT_MS = 3200;
const MAX_BODY_BYTES = 4_000_000;
const MAX_REDIRECTS = 3;

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

const JUNK_TITLE_RE =
  /\b(gift\s*card|e-?gift|digital\s*card|shipping\s*protection|route\s*package|warranty|subscription|membership|refill|replacement\s*(part|lid|straw|cap)|divider|dividers|spare\s*part|donation|sample\s*pack|gift\s*wrap|wrapping\s*(?:paper|roll)|gift\s*note|sticker\s*pack)\b/i;

const STOP_WORDS = new Set([
  "find", "me", "give", "get", "show", "search", "real", "actual", "live", "verified",
  "christmas", "holiday", "xmas", "gift", "gifts", "present", "presents", "idea", "ideas",
  "for", "my", "our", "your", "their", "his", "her", "the", "and", "who", "that", "with",
  "loves", "love", "likes", "like", "into", "enjoy", "enjoys", "under", "below", "less",
  "than", "around", "about", "max", "maximum", "budget", "usd", "dollar", "dollars", "each",
  "good", "great", "best", "nice", "awesome", "some", "please", "from", "stores", "store",
  "retail", "online", "websites", "links", "items", "products", "things", "stuff", "goods",
  "gear", "dad", "father", "mom", "mother", "sister", "brother", "aunt", "uncle", "niece",
  "nephew", "cousin", "grandma", "grandpa", "grandmother", "grandfather", "friend", "friends",
  "coworker", "colleague", "boss", "teacher", "partner", "spouse", "husband", "wife",
  "boyfriend", "girlfriend", "fiance", "son", "daughter", "kid", "child", "teen", "teenager",
  "parent", "parents", "person", "someone", "owner", "lover", "enthusiast", "fan",
]);

const QUERY_FILLER_WORDS = new Set([
  "a", "an", "the", "of", "for", "and", "or", "in", "on", "to", "with", "set", "kit",
  "gift", "gifts", "item", "items", "gear", "goods", "minimalist", "cozy", "modern",
  "classic", "unique", "cool", "cute", "nice", "great", "best", "real", "holiday", "christmas",
]);

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

export function cleanHtmlText(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&#x27;/gi, "'")
    .replace(/&#8482;|&trade;/gi, "™")
    .replace(/&#174;|&reg;/gi, "®")
    .replace(/&mdash;|&ndash;/gi, "—")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = Number(dec);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtmlSnippet(html: string | undefined, maxLen = 155): string | undefined {
  const clean = cleanHtmlText(html);
  if (!clean) return undefined;
  if (clean.length <= maxLen) return clean.length >= 12 ? clean : undefined;
  const sentMatch = clean.match(/^.{15,155}?(?<!\d)[.!?](?=\s|$)/);
  const pick = sentMatch
    ? sentMatch[0]
    : clean.slice(0, maxLen).replace(/\s+\S*$/, "").replace(/[,;:\-–—]+$/, "") + "...";
  return pick.length >= 12 ? pick : undefined;
}

function parseNumericAmount(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseBudget(text: string): number | undefined {
  const patterns = [
    /(?:under|below|less\s+than|max(?:imum)?|up\s+to|no\s+more\s+than|at\s+most|budget(?:\s+of)?|around)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\b(?:\s*(?:usd|dollars?))?/i,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:or\s+less|max|budget|each|and\s+under)/i,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/,
    /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:usd|dollars?)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const parsed = parseNumericAmount(m[1]);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

export function parseShoppingRequest(rawRequest: string): {
  recipient: string;
  maxPrice: number | undefined;
  tokens: string[];
  interestTerms: string[];
} {
  const request = rawRequest.replace(/^\s*(?:\[[^\]]+\]\s*)+/, "").trim();
  const maxPrice = parseBudget(request);

  const recipientMatch = request.match(
    /\bfor\s+(?:my\s+|a\s+|an\s+|the\s+)?([a-z]+(?:\s+[a-z]+)?)(?=\s+(?:who|that|with|under|below|less|around|in|,|\.)|$)/i,
  );
  const recipient = recipientMatch?.[1]?.trim() || "your holiday list";

  const tokens = request
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

  const interestTerms = Array.from(
    new Set(tokens.filter((t) => !STOP_WORDS.has(t) && !/^\d+$/.test(t) && t.length >= 3)),
  );

  return { recipient, maxPrice, tokens, interestTerms };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.length >= 6 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length >= 5 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length >= 5 && (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("zes") || w.endsWith("ches") || w.endsWith("shes"))) {
    return w.slice(0, -2);
  }
  if (w.length >= 4 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) {
    return w.slice(0, -1);
  }
  return w;
}

// Strict relevance verification: prevents Shopify's fuzzy predictive search from returning
// unrelated items (e.g. "Shrinking Violet" or "Illinois Mini Shaped Puzzle" for "violin",
// or "House of Astrology" for "horse").
export function matchesSearchTerm(
  product: { title?: string; type?: string; body?: string; vendor?: string },
  query: string,
): boolean {
  const qWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !QUERY_FILLER_WORDS.has(w));
  if (qWords.length === 0) return true;

  const haystack = `${cleanHtmlText(product.title)} ${cleanHtmlText(product.type)} ${cleanHtmlText(product.body)} ${cleanHtmlText(product.vendor)}`.toLowerCase();
  if (!haystack.trim()) return false;

  return qWords.every((w) => {
    const stem = stemWord(w);
    // Word-boundary prefix match on the stem (with minimum stem length >= 3).
    // e.g. "violin" -> /\bviolin/ (matches violin/violinist, rejects "violet" & "illinois")
    // e.g. "horse" -> /\bhorse/ (matches horse/horses/horseman, rejects "house")
    // e.g. "cooking" -> /\bcook/ (matches cook/cooking/cookware/cookbook)
    // e.g. "baking" -> /\bbak/ (matches bake/baking/bakeware/bakery)
    const re = new RegExp(`\\b${escapeRegExp(stem)}`, "i");
    return re.test(haystack);
  });
}

function normalizeQueries(input: ShopInput): {
  queries: string[];
  maxPrice: number | undefined;
  recipient: string;
} {
  const parsed = input.request ? parseShoppingRequest(input.request) : undefined;
  const maxPrice =
    typeof input.maxPrice === "number" && Number.isFinite(input.maxPrice) && input.maxPrice > 0
      ? input.maxPrice
      : parsed?.maxPrice;
  const recipient = input.recipient?.trim() || parsed?.recipient || "your holiday list";

  const rawQueries = Array.isArray(input.queries) && input.queries.length > 0
    ? input.queries
    : parsed?.interestTerms ?? [];

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawQueries) {
    const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!q || q.length < 2 || STOP_WORDS.has(q)) continue;
    if (seen.has(q)) continue;
    seen.add(q);
    cleaned.push(q);
    if (cleaned.length >= 5) break;
  }

  return { queries: cleaned, maxPrice, recipient };
}

export function planStoreSearches(
  input: ShopInput,
  maxStores = 6,
): {
  recipient: string;
  maxPrice: number | undefined;
  queries: string[];
  searches: StoreSearch[];
} {
  const { queries, maxPrice, recipient } = normalizeQueries(input);
  if (queries.length === 0) {
    return { recipient, maxPrice, queries: [], searches: [] };
  }

  const queryWordList = queries.map((q) => ({
    query: q,
    words: q.split(/[^a-z0-9]+/).filter((w) => w.length >= 2),
  }));

  const scored = RETAIL_STORE_CATALOG.map((entry, idx) => {
    let score = 0;
    let bestQuery: string | undefined;
    let bestQueryScore = 0;

    for (const { query, words } of queryWordList) {
      let qScore = 0;
      for (const w of words) {
        const stem = stemWord(w);
        for (const kw of entry.keywords) {
          if (kw === w || stemWord(kw) === stem) {
            qScore += entry.broad ? 2 : 4;
            break;
          }
        }
      }
      if (qScore > bestQueryScore) {
        bestQueryScore = qScore;
        bestQuery = query;
      }
      score += qScore;
    }

    // Broad multi-topic stores always remain eligible to search unseen hobbies live.
    if (entry.broad && score === 0) {
      score = 0.5;
    }

    return { entry, score, idx, bestQuery };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx);

  // Choose stores while balancing across all user queries so every interest gets live coverage.
  const chosen: Array<{ entry: StoreCatalogEntry; query: string }> = [];
  const usedStores = new Set<string>();
  const queryCounts = new Map<string, number>();

  // First pass: assign at least one best-matching specialty/broad store to each distinct query.
  for (const q of queries) {
    const match = scored.find((s) => !usedStores.has(s.entry.store) && s.bestQuery === q);
    if (match && chosen.length < maxStores) {
      usedStores.add(match.entry.store);
      chosen.push({ entry: match.entry, query: q });
      queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    }
  }

  // Second pass: fill remaining store slots up to maxStores, rotating across queries for broad stores.
  for (const s of scored) {
    if (chosen.length >= maxStores) break;
    if (usedStores.has(s.entry.store)) continue;
    usedStores.add(s.entry.store);
    const leastCoveredQuery =
      s.bestQuery && !s.entry.broad
        ? s.bestQuery
        : [...queries].sort((a, b) => (queryCounts.get(a) ?? 0) - (queryCounts.get(b) ?? 0))[0];
    chosen.push({ entry: s.entry, query: leastCoveredQuery });
    queryCounts.set(leastCoveredQuery, (queryCounts.get(leastCoveredQuery) ?? 0) + 1);
  }

  return {
    recipient,
    maxPrice,
    queries,
    searches: chosen.map(({ entry, query }) => ({
      store: entry.store,
      query,
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
  type?: string;
  body?: string;
}

// Single-request live Shopify Predictive Search (documented public endpoint).
// Requires explicit `available === true`, strict term relevance (`matchesSearchTerm`), and price <= maxPrice.
export async function searchShopifyStore(
  fetchFn: FetchFn,
  search: StoreSearch,
  maxPrice: number | undefined,
  signal?: AbortSignal,
): Promise<VerifiedGift[]> {
  const origin = normalizeOrigin(search.store);
  const params = new URLSearchParams({
    q: search.query,
    "resources[type]": "product",
    "resources[limit]": "8",
    "resources[options][unavailable_products]": "hide",
  });

  const suggestRes = await fetchFn(
    `${origin}/search/suggest.json?${params}`,
    "application/json",
    signal,
    "GET",
  ).catch(() => undefined);

  if (!suggestRes || suggestRes.status !== 200) return [];
  const body = parseJson(suggestRes.body) as {
    resources?: { results?: { products?: SuggestProduct[] } };
  } | undefined;
  const products = body?.resources?.results?.products;
  if (!Array.isArray(products) || products.length === 0) return [];

  const finalOrigin = new URL(suggestRes.url || origin).origin;
  const minPrice = maxPrice === undefined ? 5 : maxPrice >= 30 ? 8 : maxPrice >= 15 ? 4 : 0.01;
  const hits: VerifiedGift[] = [];

  for (const p of products) {
    if (typeof p.title !== "string" || typeof p.url !== "string") continue;
    // Strict stock verification: require explicit boolean `available === true`.
    if (p.available !== true) continue;
    if (JUNK_TITLE_RE.test(p.title)) continue;
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < minPrice) continue;
    if (maxPrice !== undefined && price > maxPrice) continue;
    if (!matchesSearchTerm(p, search.query)) continue;

    const cleanPath = new URL(p.url, finalOrigin).pathname.replace(/\/$/, "").replace(/\.(js|json)$/, "");
    const baseUrl = `${finalOrigin}${cleanPath}`;
    hits.push({
      title: cleanHtmlText(p.title),
      store: new URL(baseUrl).host.replace(/^www\./, ""),
      price: Number(price.toFixed(2)),
      currency: search.currency,
      url: baseUrl,
      category: search.category,
      matchedQuery: search.query,
      stockVerified: true,
      vendor: typeof p.vendor === "string" && p.vendor.trim() ? cleanHtmlText(p.vendor) : undefined,
      summary: stripHtmlSnippet(p.body),
    });
  }

  return hits;
}

export function formatMoney(price: number, currency: string): string {
  return currency === "USD" ? `$${price.toFixed(2)}` : `${price.toFixed(2)} ${currency}`;
}

export function formatGiftList(
  recipient: string,
  maxPrice: number | undefined,
  gifts: VerifiedGift[],
  queries: string[],
): string {
  const budgetNote = maxPrice !== undefined ? ` (Under $${maxPrice})` : "";

  if (gifts.length < 5) {
    const queryNote = queries.length ? ` for ${queries.join(", ")}` : "";
    const intro = `Unable to find 5 matching in-stock Christmas gifts for ${recipient}${budgetNote}${queryNote}: only ${gifts.length} live in-stock match${gifts.length === 1 ? "" : "es"} found across searched stores. Try broadening the interests or budget.`;
    if (gifts.length === 0) return intro;
    const partial = gifts.map((g, i) => {
      const brand = g.vendor ? ` · ${g.vendor}` : "";
      const stock = g.stockVerified ? " (In Stock)" : "";
      return `${i + 1}. **${g.title}** — ${formatMoney(g.price, g.currency)} USD · ${g.store}${brand}${stock}\n   ${g.url}`;
    });
    return `${intro}\n\n${partial.join("\n\n")}`;
  }

  const top5 = gifts.slice(0, 5);
  const total = top5.reduce((sum, g) => sum + g.price, 0);
  const storeCount = new Set(top5.map((g) => g.store)).size;
  const header = `🎄 5 In-Stock Christmas Gifts for ${recipient}${budgetNote}:`;

  const items = top5.map((g, i) => {
    const brand = g.vendor ? ` · ${g.vendor}` : "";
    const stock = g.stockVerified ? " (In Stock)" : "";
    const detail = g.summary ? `\n   ${g.summary}` : "";
    return `${i + 1}. **${g.title}** — ${formatMoney(g.price, g.currency)} USD · ${g.store}${brand}${stock}\n   ${g.url}${detail}`;
  });

  const footer = `Total for all 5 gifts: $${total.toFixed(2)} USD across ${storeCount} retail store${storeCount === 1 ? "" : "s"} (prices, links, and in-stock status fetched live).`;
  return `${header}\n\n${items.join("\n\n")}\n\n${footer}`;
}

export async function shopForGifts(
  fetchFn: FetchFn,
  input: string | ShopInput,
  signal?: AbortSignal,
): Promise<SleighShopResult> {
  const t0 = performance.now();
  const normalizedInput: ShopInput = typeof input === "string" ? { request: input } : input;
  const { recipient, maxPrice, queries, searches } = planStoreSearches(normalizedInput, 6);

  if (searches.length === 0) {
    return {
      ok: false,
      verifiedCount: 0,
      elapsedMs: Math.round(performance.now() - t0),
      gifts: [],
      formatted: formatGiftList(recipient, maxPrice, [], queries),
    };
  }

  const perStoreHits = await Promise.all(
    searches.map((s) => searchShopifyStore(fetchFn, s, maxPrice, signal)),
  );

  const gifts: VerifiedGift[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const seenStores = new Set<string>();
  const seenQueries = new Set<string>();

  const tryAdd = (
    item: VerifiedGift | undefined,
    opts?: { requireNewStore?: boolean; requireNewQuery?: boolean },
  ) => {
    if (!item || gifts.length >= 5) return;
    const normTitle = item.title.toLowerCase();
    if (seenUrls.has(item.url) || seenTitles.has(normTitle)) return;
    if (opts?.requireNewStore && seenStores.has(item.store)) return;
    if (opts?.requireNewQuery && seenQueries.has(item.matchedQuery)) return;
    seenUrls.add(item.url);
    seenTitles.add(normTitle);
    seenStores.add(item.store);
    seenQueries.add(item.matchedQuery);
    gifts.push(item);
  };

  // Pass 1: maximize distinct stores AND distinct queries.
  for (const hits of perStoreHits) tryAdd(hits[0], { requireNewStore: true, requireNewQuery: true });
  // Pass 2: maximize distinct stores across all hits.
  for (const hits of perStoreHits) tryAdd(hits[0], { requireNewStore: true });
  // Pass 3: round-robin additional verified matching items (e.g. niche single-hobby queries like "violin").
  for (let rank = 1; rank < 5 && gifts.length < 5; rank++) {
    for (const hits of perStoreHits) tryAdd(hits[rank]);
  }

  return {
    ok: gifts.length === 5,
    verifiedCount: gifts.length,
    elapsedMs: Math.round(performance.now() - t0),
    gifts,
    formatted: formatGiftList(recipient, maxPrice, gifts, queries),
  };
}
