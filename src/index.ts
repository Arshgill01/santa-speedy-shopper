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
        queries: Type.Array(Type.String(), {
          minItems: 1,
          maxItems: 5,
          description:
            "1 to 5 short product search terms for the user's interests (e.g. ['coffee', 'fishing', 'cooking'] or ['violin', 'sheet music']).",
        }),
        maxPrice: Type.Optional(
          Type.Number({
            description: "Maximum price per gift in USD if stated by the user (e.g. 60).",
          }),
        ),
        recipient: Type.Optional(
          Type.String({
            description: "Short recipient label (e.g. 'dad', 'aunt').",
          }),
        ),
      }),
      async execute({ queries, maxPrice, recipient }, _config, context) {
        const result = await shopForGifts(guardedFetch, { queries, maxPrice, recipient }, context.signal);
        return result.formatted;
      },
    }),
  ],
});
