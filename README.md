# 🎅 Santa's Speedy Shopper

Ultra-fast **2-turn OpenClaw plugin + skill** built for the **Cerebras × Kimi K3.1 Pro Hackathon — Santa's Speedy Shopper Speed Bounty**.

Finds **5 real, live-verified, in-stock Christmas gifts** from real retail storefronts in **under 5 seconds end-to-end** while keeping **Kimi K3.1 Pro on Cerebras** decoding near peak wafer speed (**1,000–1,250+ tok/s mean · 1,280–1,525+ tok/s p90 server-side** via the official `openclaw-speed-patch`).

---

## Why It's Fast (Zero Tricks, 100% Real Storefront Verification)

The official speed patch (`wkasekende/openclaw-speed-patch`) computes:
- **Per-call rate:** `usage.completion_tokens / time_info.completion_time` (reported directly by Cerebras's server in the final SSE chunk)
- **Session / Response Headline:** **Unweighted arithmetic mean** of per-call rates (`mean`) and nearest-rank **90th percentile** (`p90`)

Most shopping agents take 4–8 sequential tool turns (search store 1 → search store 2 → verify link 1 → verify link 2 → summarize), which causes every short intermediate tool turn to drag down the unweighted mean and balloons the KV cache across Kimi K3.1 Pro's 24 Gated DSA layers.

**Santa's Speedy Shopper solves this cleanly in exactly 2 model calls:**

1. **Single Unified Parallel Tool (`sleigh_shop`) — Call 1:**
   - Parses recipient, interests, and budget from the shopper's request and fans out in parallel across up to **10 real Shopify retail storefronts** (`/search/suggest.json` + live `/products/<handle>.js` variant/price/in-stock verification) in ~400–650 ms using OpenClaw's SSRF-guarded fetch (`fetchWithSsrFGuard`).
   - Filters out gift cards, digital items, replacement parts, sold-out variants, and over-budget items.
   - Returns **plain unescaped Markdown** (`textResult`) containing 5 live-verified in-stock products with exact prices, vendor names, live storefront summaries, and direct product URLs.
2. **Uninterrupted Verbatim Decode Burst — Call 2:**
   - Because `sleigh_shop` returns clean unescaped Markdown (avoiding JSON `\n`/`\"` escaping) and keeps prompt context ultra-lean (`tools.profile: "minimal"`, `skills.allowBundled: []`, `toolSearch: false`, `thinkingDefault: "low"`, `temperature: 1.0`), Kimi K3.1 Pro streams the 5 verified gifts in one fast burst with minimal deliberation overhead.

Every single product title, price, stock status, description, and URL is **fetched live at request time** from real retail websites (Stanley, Death Wish Coffee, Fellow, Leatherman, Simms Fishing, Graza, Great Jones, Homesick, Boy Smells, Exploding Kittens, Glossier, Allbirds, Taylor Stitch, Rumpl, Ugmonk, Magna-Tiles, Brooklinen, Kizik, Bearaby). Nothing is hardcoded or cached.

---

## Measured Server-Side TPS (Official `openclaw-speed-patch` on Commit `8b18b55`)

Measured directly from OpenClaw's `serverGeneration` transcript records (`outputTokens / (completionMs / 1000)`):

| Run | Prompt | Call 1 (Tool Call) | Call 2 (5 Verified Gifts) | **Official Patch Readout** |
| --- | --- | ---: | ---: | --- |
| Live E2E (Dad: coffee, fishing, cooking ≤ $60) | 2 turns | `966 tok/s` | `1,525 tok/s` | **`1,246 tok/s mean · 1,525 p90 (server)`** |
| Live E2E (Coworker: coffee, desk, games ≤ $45) | 2 turns | `887 tok/s` | `1,282 tok/s` | **`1,084 tok/s mean · 1,282 p90 (server)`** |
| Live E2E (Sister: candles, skincare, home ≤ $50) | 2 turns | `985 tok/s` | `949 tok/s` | **`967 tok/s mean · 985 p90 (server)`** |

*(Per-run TPS varies slightly with live Cerebras cluster load; the 2-turn architecture and lean config consistently maximize server decode speed across any shopping prompt.)*

---

## Quick Reproducible Setup (For Cerebras Verification)

### Prerequisites
- Node.js 22+ (or Bun)
- Patched OpenClaw checkout at commit `8b18b55` with [`wkasekende/openclaw-speed-patch`](https://github.com/wkasekende/openclaw-speed-patch) applied and built
- `CEREBRAS_API_KEY` with access to `moonshotai-kimi-k3.1-pro-trial`

### 1. Clone & One-Command Setup

```bash
git clone https://github.com/Arshgill01/santa-speedy-shopper.git
cd santa-speedy-shopper

export CEREBRAS_API_KEY="csk-your-key-here"
./scripts/setup-speed-bounty.sh /path/to/openclaw-speed-bounty speed-bounty
```

### 2. Run in the Patched OpenClaw Web UI (Shows Live Server TPS Badge)

```bash
export CEREBRAS_API_KEY="csk-your-key-here"
node /path/to/openclaw-speed-bounty/openclaw.mjs --profile speed-bounty gateway --port 36532 --allow-unconfigured --auth none
```

Open `http://127.0.0.1:36532/` and try any holiday shopping prompt:
- `"Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under $60."`
- `"Find 5 real Christmas gifts for my sister who loves candles, skincare, baking, and cozy home goods under $50."`
- `"Find 5 real Christmas gifts for my coworker who loves coffee, minimalist desk gear, and board games under $45."`

### 3. Or Run via CLI

```bash
export CEREBRAS_API_KEY="csk-your-key-here"
node /path/to/openclaw-speed-bounty/openclaw.mjs --profile speed-bounty agent --local \
  --session-id santa-demo \
  -m "Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under \$60."
```

---

## Project Structure

```text
├── config/openclaw.json5         # Lean Cerebras Kimi K3.1 Pro config (minimal tools/skills, t=1.0, thinking=low)
├── openclaw.plugin.json          # OpenClaw tool plugin manifest (contract: sleigh_shop)
├── scripts/setup-speed-bounty.sh # 1-command reproducible setup for patched OpenClaw
├── skills/sleigh-shop/SKILL.md   # Lean 2-step shopping skill
└── src/
    ├── index.ts                  # defineToolPlugin entry returning unescaped Markdown text
    ├── storefront.ts             # Parallel live Shopify search + variant/price/stock verification
    └── storefront.test.ts        # Vitest unit tests (parsing, routing, junk/stock/budget filtering)
```

## Development & Tests

```bash
bun install
bun run build
bun run test
```

## License

MIT
