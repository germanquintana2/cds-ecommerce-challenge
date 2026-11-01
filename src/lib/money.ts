export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
