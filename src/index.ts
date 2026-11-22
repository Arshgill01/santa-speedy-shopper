import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";
import { guardedFetch, shopForGifts } from "./storefront.js";

export default defineToolPlugin({
  id: "santa-speedy-shopper",
  name: "Santa's Speedy Shopper",
  description:
    "Search real Shopify retail stores in parallel and return 5 live in-stock Christmas gifts with prices and links.",
  tools: (tool) => [
    tool({
      name: "sleigh_shop",
      label: "Sleigh shop",
      description:
        "Search live retail storefronts in parallel for 5 in-stock Christmas gifts matching the user's interests and budget.",
      workspaceAccess: false,
      parameters: Type.Object({
        request: Type.String({
          description: "The shopper's exact gift request verbatim",
        }),
      }),
      async execute({ request }, _config, context) {
        const result = await shopForGifts(guardedFetch, { request }, context.signal);
        return result.formatted;
      },
    }),
  ],
});
