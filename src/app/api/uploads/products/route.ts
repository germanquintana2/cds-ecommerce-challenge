import { readImageForm } from "~/server/uploads/read-image-form";
import { TRPCError } from "@trpc/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { productIdSchema } from "~/server/validation/product";
import {
  ImageValidationError,
  uploadProductImage,
  deleteProductImage,
  logStorageError,
} from "~/server/integrations/product-images";

export async function POST(request: Request) {
  let uploadedKey: string | undefined;
  try {
    const expectedOrigin = new URL(process.env.BETTER_AUTH_URL ?? request.url)
      .origin;
    if (request.headers.get("origin") !== expectedOrigin) {
      return Response.json(
        { error: "Origen de la solicitud no permitido." },
        { status: 403 },
      );
    }
    const caller = createCaller(
      await createTRPCContext({ headers: request.headers }),
    );
    await caller.admin.currentUser();
    const form = await readImageForm(request);
    const parsed = productIdSchema.safeParse({ id: form.get("productId") });
    const file = form.get("file");
    if (!parsed.success || !(file instanceof File))
      throw new ImageValidationError(
        "Seleccioná un producto y una imagen válida.",
      );
    await caller.adminProduct.byId({ id: parsed.data.id });
    uploadedKey = await uploadProductImage(parsed.data.id, file);
    const result = await caller.adminProduct.attachImage({
      id: parsed.data.id,
      imageKey: uploadedKey,
    });
    return Response.json(result);
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteProductImage(uploadedKey);
      } catch (cleanupError) {
        logStorageError(cleanupError);
      }
    }
    if (error instanceof ImageValidationError)
      return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
      const statuses: Partial<Record<TRPCError["code"], number>> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
      };
      const status = statuses[error.code] ?? 400;
      return Response.json({ error: error.message }, { status });
    }
    logStorageError(error);
    return Response.json(
      {
        error:
          "No se pudo guardar la imagen. Intentá nuevamente en unos momentos.",
      },
      { status: 503 },
    );
  }
}
