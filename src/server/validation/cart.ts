import { z } from "zod";
import { productIdSchema } from "./product";

export const MAX_CART_ITEMS = 100;
export const cartProductSchema = z.object({
  productId: productIdSchema.shape.id,
});
export const quantitySchema = z.number().int().min(1).max(99);
export const cartAddSchema = cartProductSchema.extend({
  quantity: quantitySchema.default(1),
});
export const cartRemoveSchema = cartProductSchema.extend({
  expectedVersion: z.number().int().min(0),
});
export const cartSetQuantitySchema = cartRemoveSchema.extend({
  quantity: quantitySchema,
});
