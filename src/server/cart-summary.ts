import { createHash } from "node:crypto";
import type { CartView, CartLine } from "~/lib/cart-types";
import { MAX_PRICE_CENTS } from "~/server/validation/product";

export function cartSummary(
  id: string | null,
  version: number,
  items: CartLine[],
): CartView {
  const totalCents = items.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );
  const limitExceeded = totalCents > MAX_PRICE_CENTS;
  const quoteHash = id
    ? createHash("sha256")
        .update(
          JSON.stringify({
            id,
            version,
            currency: "USD",
            items: items
              .map(({ productId, name, priceCents, quantity, available }) => ({
                productId,
                name,
                priceCents,
                quantity,
                available,
              }))
              .sort((a, b) => a.productId.localeCompare(b.productId)),
          }),
        )
        .digest("hex")
    : null;
  return {
    id,
    version,
    items,
    subtotalCents: totalCents,
    totalCents,
    limitExceeded,
    canCheckout:
      items.length > 0 &&
      items.every((item) => item.available) &&
      !limitExceeded,
    quoteHash,
  };
}
