import { z } from "zod";
export const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingresá un nombre.")
    .max(80, "Usá hasta 80 caracteres."),
});
export const categoryIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const categoryCreateSchema = categoryFieldsSchema
  .extend({
    id: z.uuid().optional(),
    imageKey: z
      .string()
      .regex(/^categories\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
      .optional(),
    productIds: z
      .array(categoryIdSchema)
      .max(200)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "No repitas productos.",
      )
      .default([]),
  })
  .refine(
    (value) =>
      !value.imageKey ||
      (value.id && value.imageKey.startsWith(`categories/${value.id}/`)),
    "La imagen no pertenece a esta categoría.",
  );

export const categoryUpdateSchema = categoryFieldsSchema
  .extend({
    id: categoryIdSchema,
    imageKey: z
      .string()
      .regex(/^categories\/[a-zA-Z0-9_-]{1,80}\/[0-9a-f-]{36}\.webp$/)
      .nullable()
      .optional(),
    productIds: z
      .array(categoryIdSchema)
      .max(200)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "No repitas productos.",
      )
      .optional(),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .refine(
    (value) =>
      !value.imageKey || value.imageKey.startsWith(`categories/${value.id}/`),
    "La imagen no pertenece a esta categoría.",
  );
