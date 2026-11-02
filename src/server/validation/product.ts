import { categoryIdSchema } from "./category";
import { z } from "zod";

export const MAX_PRICE_CENTS = 99_999_999;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const productIdSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const productFieldsSchema = z.object({
  categoryId: categoryIdSchema,
  name: z.string().trim().min(1, "Ingresá un nombre.").max(120),
  description: z.string().trim().min(1, "Ingresá una descripción.").max(5000),
  priceCents: z
    .number()
    .int("El precio debe expresarse en centavos enteros.")
    .min(1, "El precio debe ser mayor que cero.")
    .max(MAX_PRICE_CENTS, "El precio supera el máximo permitido."),
});

export const productUpdateSchema = productFieldsSchema.extend({
  id: productIdSchema.shape.id,
  active: z.boolean(),
});

export const productImageSchema = productIdSchema.extend({
  imageKey: z
    .string()
    .regex(/^products\/[a-zA-Z0-9_-]{1,80}\/[0-9a-f-]{36}\.webp$/),
});

// Split decimal strings instead of multiplying floating point prices.
export const priceInputSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,6}(?:[.,]\d{1,2})?$/,
    "Usá un precio positivo con hasta dos decimales.",
  )
  .transform((value) => {
    const [whole, decimals = ""] = value.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  })
  .pipe(productFieldsSchema.shape.priceCents);

export const productFormSchema = productFieldsSchema
  .pick({ name: true, description: true, categoryId: true })
  .extend({
    price: priceInputSchema,
    active: z.boolean(),
  });
