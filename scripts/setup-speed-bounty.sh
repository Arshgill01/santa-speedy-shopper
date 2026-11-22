#!/usr/bin/env bash
set -euo pipefail

# One-command reproducible setup for Santa's Speedy Shopper on patched OpenClaw (8b18b55).
# Usage:
#   export CEREBRAS_API_KEY="csk-..."
#   ./scripts/setup-speed-bounty.sh /path/to/patched-openclaw [profile-name]

OPENCLAW_DIR="${1:-}"
PROFILE="${2:-speed-bounty}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "$OPENCLAW_DIR" || ! -f "$OPENCLAW_DIR/openclaw.mjs" ]]; then
  echo "Usage: $0 /path/to/patched-openclaw [profile-name]" >&2
  echo "Example: $0 ../openclaw-speed-bounty speed-bounty" >&2
  exit 1
fi

OC="$OPENCLAW_DIR/openclaw.mjs"

echo "==> 1/4 Building and testing santa-speedy-shopper plugin..."
cd "$REPO_DIR"
if command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile || bun install
  bun run build
  bun run test
else
  npm install
  npm run build
  npm test
fi
node "$OC" plugins build --entry ./dist/index.js
node "$OC" plugins validate --entry ./dist/index.js

echo "==> 2/4 Installing lean OpenClaw config into profile '$PROFILE'..."
PROFILE_DIR="$HOME/.openclaw-$PROFILE"
mkdir -p "$PROFILE_DIR/workspace"
cp "$REPO_DIR/config/openclaw.json5" "$PROFILE_DIR/openclaw.json"

# Strip heavy default workspace bootstrap files for minimal KV cache on Kimi K3.1 Pro
rm -f "$PROFILE_DIR/workspace/"{BOOTSTRAP.md,HEARTBEAT.md,MEMORY.md,TOOLS.md}
cat << 'WSEOF' > "$PROFILE_DIR/workspace/AGENTS.md"
# Santa's Speedy Shopper
1. Immediately call `sleigh_shop` with `request` copied verbatim. Skip reasoning.
2. Echo the tool output verbatim as your final reply. Skip reasoning.
WSEOF
echo "Santa's Speedy Shopper" > "$PROFILE_DIR/workspace/IDENTITY.md"
echo "Fast, accurate holiday gift assistant." > "$PROFILE_DIR/workspace/SOUL.md"
echo "Shopper looking for 5 real in-stock Christmas gifts." > "$PROFILE_DIR/workspace/USER.md"

echo "==> 3/4 Linking plugin into profile '$PROFILE'..."
node "$OC" --profile "$PROFILE" plugins install --force --link "$REPO_DIR" --accept-capabilities

echo "==> 4/4 Done! Ready to run:"
echo "  Verify: node \"$REPO_DIR/scripts/verify-bounty.mjs\" \"$OPENCLAW_DIR\" \"$PROFILE\""
echo "  CLI:    node \"$OC\" --profile \"$PROFILE\" agent --local --session-id santa-demo -m \"Find 5 real Christmas gifts for my dad who loves coffee, fishing, and cooking under \\\$60.\""
echo "  Web UI: node \"$OC\" --profile \"$PROFILE\" gateway --port 36532 --allow-unconfigured --auth none"
