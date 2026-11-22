import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";
import { guardedFetch, shopForGifts } from "./storefront.js";

export default defineToolPlugin({
  id: "santa-speedy-shopper",
  name: "Santa's Speedy Shopper",
  description:
    "Find and live-verify 5 real in-stock Christmas gifts across real retail stores in a single parallel tool call.",
  tools: (tool) => [
    tool({
      name: "sleigh_shop",
      label: "Sleigh shop",
      description:
        "Search real retail stores in parallel and return 5 live-verified in-stock Christmas gifts with exact prices and product links in ONE call.",
      workspaceAccess: false,
      parameters: Type.Object({
        request: Type.String({
          description: "The shopper's exact gift request verbatim",
        }),
      }),
      async execute({ request }, _config, context) {
        const result = await shopForGifts(guardedFetch, request, context.signal);
        return result.formatted;
      },
    }),
  ],
});
