import { describe, expect, test } from "bun:test";
import { cartSummary } from "../../src/server/cart-summary";
import { safeReturnPath } from "../../src/lib/return-path";

const line = {
  productId: "product-a",
  name: "Producto",
  priceCents: 1999,
  quantity: 2,
  lineTotalCents: 3998,
  available: true,
  imageUrl: null,
};

describe("cart totals and quote invalidation", () => {
  test("uses integer cents and blocks empty or unavailable carts", () => {
    expect(cartSummary(null, 0, []).canCheckout).toBe(false);
    const summary = cartSummary("cart", 1, [line]);
    expect(summary.totalCents).toBe(3998);
    expect(summary.subtotalCents).toBe(3998);
    expect(summary.canCheckout).toBe(true);
    expect(
      cartSummary("cart", 1, [{ ...line, available: false }]).canCheckout,
    ).toBe(false);
    expect(
      cartSummary("cart", 1, [{ ...line, lineTotalCents: 100_000_000 }])
        .limitExceeded,
    ).toBe(true);
  });

  test("price, quantity, availability and cart version changes invalidate the quote", () => {
    const hash = cartSummary("cart", 1, [line]).quoteHash;
    for (const changed of [
      { ...line, priceCents: 2000 },
      { ...line, quantity: 3 },
      { ...line, available: false },
    ]) {
      expect(cartSummary("cart", 1, [changed]).quoteHash).not.toBe(hash);
    }
    expect(cartSummary("cart", 2, [line]).quoteHash).not.toBe(hash);
  });

  test("image URL renewal does not invalidate a purchase quote", () => {
    expect(
      cartSummary("cart", 1, [
        { ...line, imageUrl: "https://image.example/renewed" },
      ]).quoteHash,
    ).toBe(cartSummary("cart", 1, [line]).quoteHash);
  });
});

describe("login return paths", () => {
  test("accepts only local shopping destinations", () => {
    expect(safeReturnPath("/cart")).toBe("/");
    expect(safeReturnPath("/products/product-a")).toBe("/products/product-a");
    expect(safeReturnPath("/checkout/result?attempt=own-attempt")).toBe(
      "/checkout/result?attempt=own-attempt",
    );
    expect(safeReturnPath("/orders/order-a")).toBe("/orders/order-a");
    expect(safeReturnPath("/profile")).toBe("/profile");
    for (const unsafe of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/login",
      "/admin",
      null,
    ]) {
      expect(safeReturnPath(unsafe)).toBe("/");
    }
  });
});
