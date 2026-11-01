export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "http://local");
    if (url.origin !== "http://local") return "/";
    if (
      url.pathname !== "/" &&
      url.pathname !== "/cart" &&
      url.pathname !== "/products" &&
      url.pathname !== "/orders" &&
      url.pathname !== "/profile" &&
      url.pathname !== "/dashboard" &&
      url.pathname !== "/checkout/result" &&
      !/^\/orders\/[a-zA-Z0-9_-]+$/.test(url.pathname) &&
      !/^\/products\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    )
      return "/";
    return (
      (url.pathname === "/products" || url.pathname === "/cart"
        ? "/"
        : url.pathname) + url.search
    );
  } catch {
    return "/";
  }
}

export function loginPath(returnTo: string) {
  return `/login?${new URLSearchParams({ next: safeReturnPath(returnTo) })}`;
}
