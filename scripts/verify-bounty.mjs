#!/usr/bin/env node
/**
 * End-to-end verification & benchmark runner for Santa's Speedy Shopper
 * on Patched OpenClaw (commit 8b18b55 + wkasekende/openclaw-speed-patch).
 *
 * - Runs fresh sessions through OpenClaw -> Cerebras (moonshotai-kimi-k3.1-pro-trial).
 * - Reads exact `serverGeneration` telemetry from OpenClaw's SQLite transcript store,
 *   decompressing `event_zstd` rows when `event_json` is NULL so no calls are dropped.
 * - Uses the exact mean & p90 formulas from `ui/src/pages/chat/chat-generation-speed.ts`.
 * - Independently verifies all 5 returned retail product URLs return HTTP 200.
 * - Appends every attempt (pass or fail) with commit hash to a JSONL history log.
 *
 * Usage:
 *   node scripts/verify-bounty.mjs [openclawDir] [profile] [--unseen] [--prompt "..."] [--runs N] [--log path]
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { zstdDecompressSync } from "node:zlib";

const repoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const positional = [];
let useUnseen = false;
let customPrompt = null;
let repeatRuns = 1;
let logPath = null;
let delayMs = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--unseen") useUnseen = true;
  else if (args[i] === "--prompt" && args[i + 1]) customPrompt = args[++i];
  else if (args[i] === "--runs" && args[i + 1]) repeatRuns = Math.max(1, Number(args[++i]) || 1);
  else if (args[i] === "--log" && args[i + 1]) logPath = args[++i];
  else if (args[i] === "--delay" && args[i + 1]) delayMs = Math.max(0, Number(args[++i]) || 0);
  else if (!args[i].startsWith("--")) positional.push(args[i]);
}

const openclawDir = positional[0] || join(homedir(), "Developer", "openclaw-speed-bounty");
const profile = positional[1] || "speed-bounty";
const openclawBin = join(openclawDir, "openclaw.mjs");
const profileDir = join(homedir(), `.openclaw-${profile}`);
const dbPath = join(profileDir, "agents", "main", "agent", "openclaw-agent.sqlite");
const historyFile = logPath || join(profileDir, "bench-history.jsonl");

if (!existsSync(openclawBin)) {
  console.error(`OpenClaw entrypoint not found at ${openclawBin}`);
  process.exit(1);
}
if (!process.env.CEREBRAS_API_KEY) {
  const envPath = join(repoDir, ".env");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^CEREBRAS_API_KEY=(.+)$/m);
    if (match) process.env.CEREBRAS_API_KEY = match[1].trim();
  }
}
if (!process.env.CEREBRAS_API_KEY) {
  console.error("CEREBRAS_API_KEY is required.");
  process.exit(1);
}

let commitSha = "unknown";
let dirty = false;
try {
  commitSha = execFileSync("git", ["-C", repoDir, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  dirty = Boolean(execFileSync("git", ["-C", repoDir, "status", "--porcelain"], { encoding: "utf8" }).trim());
} catch {}

const standardPrompts = [
  {
    key: "dad",
    label: "Dad (coffee, fishing, cooking ≤ $60)",
    prompt: "Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under $60.",
  },
  {
    key: "bro",
    label: "Brother (keyboards, photography, dogs, camping ≤ $55)",
    prompt: "Find 5 real Christmas gifts for my brother who loves mechanical keyboards, photography, dogs, and camping under $55.",
  },
  {
    key: "sis",
    label: "Sister (candles, skincare, baking, cozy home ≤ $50)",
    prompt: "Find 5 real Christmas gifts for my sister who loves candles, skincare, baking, and cozy home goods under $50.",
  },
  {
    key: "cow",
    label: "Coworker (coffee, desk gear, board games ≤ $45)",
    prompt: "Find 5 real Christmas gifts for my coworker who loves coffee, minimalist desk gear, and board games under $45.",
  },
];

const unseenPrompts = [
  {
    key: "aunt-violin",
    label: "Unseen: Aunt (violin ≤ $60)",
    prompt: "Find 5 real Christmas gifts for my aunt who loves violin under $60.",
  },
  {
    key: "niece-horses",
    label: "Unseen: Niece (horses ≤ $50)",
    prompt: "Find 5 real Christmas gifts for my niece who loves horses under $50.",
  },
  {
    key: "friend-astronomy",
    label: "Unseen: Friend (astronomy ≤ $50)",
    prompt: "Find 5 real Christmas gifts for my friend who loves astronomy under $50.",
  },
];

const baseList = customPrompt
  ? [{ key: "custom", label: customPrompt.slice(0, 60), prompt: customPrompt }]
  : useUnseen
    ? unseenPrompts
    : standardPrompts;

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function decodeTranscriptEvent(row) {
  if (typeof row.event_json === "string" && row.event_json.length > 0) {
    return JSON.parse(row.event_json);
  }
  if (row.event_zstd) {
    const buf = Buffer.isBuffer(row.event_zstd) ? row.event_zstd : Buffer.from(row.event_zstd);
    return JSON.parse(zstdDecompressSync(buf).toString("utf8"));
  }
  return null;
}

const summary = [];
let failed = false;

let runCounter = 0;
for (let runIdx = 1; runIdx <= repeatRuns; runIdx++) {
  for (const item of baseList) {
    if (runCounter > 0 && delayMs > 0) await sleep(delayMs);
    runCounter++;
    const sessionId = `verify-${item.key}-${Date.now()}-r${runIdx}`;
    let raw = "";
    let cliError = null;
    try {
      raw = execFileSync(
        process.execPath,
        [openclawBin, "--profile", profile, "agent", "--local", "--session-id", sessionId, "-m", item.prompt, "--json"],
        { encoding: "utf8", env: process.env, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (err) {
      cliError = String(err?.stderr || err?.message || err).slice(-400);
    }

    let reply = "";
    let wallMs = 0;
    if (!cliError) {
      try {
        const out = JSON.parse(raw);
        reply = out.payloads?.[0]?.text ?? "";
        wallMs = out.meta?.durationMs ?? 0;
      } catch (err) {
        cliError = `Invalid JSON output: ${String(err)}`;
      }
    }

    const urls = Array.from(new Set(reply.match(/https:\/\/[^\s)>]+/g) ?? []));
    const stores = new Set(
      urls.map((u) => {
        try {
          return new URL(u).host.replace(/^www\./, "");
        } catch {
          return "invalid";
        }
      }),
    );

    const urlChecks = await Promise.all(
      urls.map(async (u) => {
        const res = await fetch(u, {
          method: "GET",
          redirect: "follow",
          headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "accept-language": "en-US,en;q=0.9" },
          signal: AbortSignal.timeout(6000),
        }).catch(() => ({ status: 0 }));
        return { url: u, status: res.status };
      }),
    );
    const live200 = urlChecks.filter((c) => c.status === 200).length;

    const calls = [];
    if (existsSync(dbPath)) {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const rows = db
        .prepare("SELECT seq, event_json, event_zstd FROM transcript_events WHERE session_id = ? ORDER BY seq ASC")
        .all(sessionId);
      db.close();

      for (const r of rows) {
        const ev = decodeTranscriptEvent(r);
        const msg = ev?.message;
        const sg = msg?.serverGeneration;
        if (msg?.role === "assistant" && sg && sg.completionMs > 0 && sg.outputTokens >= 1) {
          calls.push({
            rate: sg.outputTokens / (sg.completionMs / 1000),
            out: sg.outputTokens,
            reason: msg.usage?.reasoningTokens ?? 0,
            inTok: (msg.usage?.input ?? 0) + (msg.usage?.cacheRead ?? 0),
            ms: sg.completionMs,
          });
        }
      }
    }

    const rates = calls.map((c) => c.rate);
    const mean = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    const sorted = [...rates].sort((a, b) => a - b);
    const p90 = sorted.length ? sorted[Math.max(0, Math.ceil(0.9 * sorted.length) - 1)] : 0;

    // Strictly require exactly 5 live HTTP 200 links and at least 1 timed model call.
    const ok = !cliError && urls.length === 5 && live200 === 5 && rates.length > 0;
    if (!ok) failed = true;

    const record = {
      timestamp: new Date().toISOString(),
      commit: commitSha,
      dirty,
      profile,
      sessionId,
      key: item.key,
      label: item.label,
      ok,
      mean: Math.round(mean),
      p90: Math.round(p90),
      wallMs,
      urlCount: urls.length,
      live200,
      stores: stores.size,
      calls,
      urlChecks,
      cliError,
    };
    appendFileSync(historyFile, `${JSON.stringify(record)}\n`, "utf8");
    summary.push(record);

    const callDesc = calls
      .map((c, idx) => `C${idx + 1}=${Math.round(c.rate)}(out=${c.out},r=${c.reason},in=${c.inTok},ms=${Math.round(c.ms)})`)
      .join(" | ");
    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${item.label} (${commitSha}${dirty ? "-dirty" : ""})\n       ${Math.round(mean)} tok/s mean · ${Math.round(p90)} p90 (server) | wall=${wallMs}ms | links=${live200}/${urls.length} HTTP 200 | stores=${stores.size}\n       ${callDesc || cliError || "no serverGeneration telemetry"}`,
    );
  }
}

const validMeans = summary.filter((s) => s.ok).map((s) => s.mean);
const validP90s = summary.filter((s) => s.ok).map((s) => s.p90);
const avgMean = validMeans.length ? Math.round(validMeans.reduce((a, b) => a + b, 0) / validMeans.length) : 0;
const medMean = Math.round(median(validMeans));
const minMean = validMeans.length ? Math.round(Math.min(...validMeans)) : 0;
const maxMean = validMeans.length ? Math.round(Math.max(...validMeans)) : 0;
const maxP90 = validP90s.length ? Math.round(Math.max(...validP90s)) : 0;
const passedCount = summary.filter((s) => s.ok).length;
console.log(`\n=== SUITE SUMMARY (${passedCount}/${summary.length} passed | commit ${commitSha}${dirty ? "-dirty" : ""}) ===`);
console.log(
  `Median Mean: ${medMean} tok/s | Avg Mean: ${avgMean} tok/s | Range: ${minMean}–${maxMean} tok/s | Peak P90: ${maxP90} tok/s | Log: ${historyFile}`,
);
if (failed) process.exit(1);
