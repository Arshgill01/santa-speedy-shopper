# Santa's Speedy Shopper

OpenClaw tool plugin for the **Cerebras × Kimi K3.1 Pro Hackathon — Santa's Speedy Shopper Speed Bounty**.

Searches live public Shopify retail storefronts in parallel for 5 in-stock Christmas gifts matching a shopper's interests and budget, running on unmodified OpenClaw (`8b18b55`) + the official Cerebras speed patch (`wkasekende/openclaw-speed-patch`).

## How It Works

1. **Model Call 1 (Single tool call):** Kimi K3.1 Pro on Cerebras calls `sleigh_shop({ request })` passing the shopper's gift request verbatim.
2. **Parallel live retail search (`sleigh_shop`):** Parses search terms and budget from `request` and routes across up to 5 matching public Shopify storefronts (34 specialty and multi-topic stores) using Shopify's documented Predictive Search API (`/search/suggest.json?resources[type]=product&resources[options][unavailable_products]=hide`). Every returned product must pass:
   - explicit `available === true` stock status,
   - term relevance matching against the search query,
   - budget and non-gift-card filtering.
   If fewer than 5 matching in-stock gifts are found, the tool reports failure honestly rather than padding with unrelated items.
3. **Model Call 2 (Final reply):** Kimi K3.1 Pro echoes the tool's unescaped Markdown gift list verbatim.

## Lean OpenClaw Configuration

[`config/openclaw.json5`](config/openclaw.json5) keeps the prompt prefix small without modifying OpenClaw itself:

- `model.primary`: `cerebras/moonshotai-kimi-k3.1-pro-trial` (`https://api.cerebras.ai/v1`)
- `thinkingDefault: "low"`, `temperature: 1.0`
- `plugins.allow: ["santa-speedy-shopper"]`, `plugins.slots.memory: "none"`
- `skills.allowBundled: []`
- `tools.profile: "minimal"`, `tools.alsoAllow: ["sleigh_shop"]`, `tools.deny: ["presence", "session_status"]`, `tools.toolSearch: false`

## Reproducible Setup (Patched OpenClaw `8b18b55`)

```bash
# 1. Clone OpenClaw at commit 8b18b55 and apply wkasekende/openclaw-speed-patch
#    (Follow the official patch README to build OpenClaw and Control UI)

# 2. Export your Cerebras API key
export CEREBRAS_API_KEY="csk-..."

# 3. Build, test, validate, and link this plugin into a clean profile
./scripts/setup-speed-bounty.sh /path/to/patched-openclaw speed-bounty
```

### Run via Web UI (Control UI with Speed Badge)

```bash
node /path/to/patched-openclaw/openclaw.mjs --profile speed-bounty gateway --port 36532 --allow-unconfigured --auth none
```

Open `http://127.0.0.1:36532/` in a fresh chat and try a documented prompt:

- `"Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under $60."`
- `"Find 5 real Christmas gifts for my sister who loves candles, skincare, baking, and cozy home goods under $50."`
- `"Find 5 real Christmas gifts for my niece who loves horses under $50."`

### Verify End-to-End (Official Patch SQLite Formula + Live HTTP 200 Check)

```bash
# 4 standard personas
node scripts/verify-bounty.mjs /path/to/patched-openclaw speed-bounty

# Additional hobby prompts (violin, horses, astronomy — matching stores & keywords are in the catalog)
node scripts/verify-bounty.mjs /path/to/patched-openclaw speed-bounty --unseen
```

`verify-bounty.mjs` reads `serverGeneration` directly from OpenClaw's SQLite transcript store (including `event_zstd` compressed rows), applies the exact `mean` / `p90` calculation from `ui/src/pages/chat/chat-generation-speed.ts`, checks returned product URLs, and logs every run (including failures) with the git commit hash.

## Benchmarks (Commit `1043f3a`)

Measured on unmodified OpenClaw `8b18b55` + `wkasekende/openclaw-speed-patch` with `cerebras/moonshotai-kimi-k3.1-pro-trial` (`thinkingDefault: "low"`, `temperature: 1.0`) across clean sessions:

- **Attempts:** 17 benchmark attempts (**13 succeeded** with 5 live Shopify product URLs; 4 failed on Cerebras HTTP 429 rate-limit / high-traffic responses)
- **Median session mean (succeeded runs):** **758 tok/s** (average 829 tok/s, range 516–1,182 tok/s)
- **Best run:** **1,182 tok/s mean · 1,455 tok/s p90** (saved session `ab2-c-p10-niece-horses-1795337699349` — Call 1: 910 tok/s, Call 2: 1,455 tok/s; prompt: *"Find 5 real Christmas gifts for my niece who loves horses under $50."* — horse/equestrian stores and keywords are included in the catalog)

## Unit Tests

```bash
bun run build
bun run test
```

## Attribution & License

MIT License — see [`LICENSE`](LICENSE).

Portions of [`src/storefront.ts`](src/storefront.ts) (SSRF-guarded fetch helpers `guardedFetch`, `readCapped`, `normalizeOrigin`, and Shopify predictive search scaffolding) were adapted from [checked-twice](https://github.com/Chinteyley/checked-twice) (MIT License, Copyright (c) 2026 chintey).
