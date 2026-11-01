import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";

describe("session navigation", () => {
  test("catalog and product details are public without a session", () => {
    for (const path of ["/", "/products", "/products/product-a"]) {
      const response = proxy(new NextRequest(`http://localhost:3100${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });
  for (const pathname of ["/login", "/signup"]) {
    test(`${pathname} stays reachable with a stale session cookie`, () => {
      const request = new NextRequest(`http://localhost:3100${pathname}`, {
        headers: { Cookie: "better-auth.session_token=expired.invalid" },
      });
      const response = proxy(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  }

  test("a protected page without a cookie redirects to login", () => {
    const response = proxy(new NextRequest("http://localhost:3100/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3100/login?next=%2Fdashboard",
    );
  });

  test("checkout return reference survives a missing session", () => {
    const response = proxy(
      new NextRequest(
        "http://localhost:3100/checkout/result?attempt=attempt-a",
      ),
    );
    const destination = new URL(response.headers.get("location"));
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("next")).toBe(
      "/checkout/result?attempt=attempt-a",
    );
  });

  test("a cookie only passes navigation through to server-side session validation", () => {
    const request = new NextRequest("http://localhost:3100/dashboard", {
      headers: { Cookie: "better-auth.session_token=expired.invalid" },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
