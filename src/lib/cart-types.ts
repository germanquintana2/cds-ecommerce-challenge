export type CartLine = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  available: boolean;
  imageUrl: string | null;
};

export type CartView = {
  id: string | null;
  version: number;
  items: CartLine[];
  subtotalCents: number;
  totalCents: number;
  canCheckout: boolean;
  limitExceeded: boolean;
  quoteHash: string | null;
};
