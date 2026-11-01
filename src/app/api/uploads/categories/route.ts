import { categoryIdSchema } from "~/server/validation/category";
import { TRPCError } from "@trpc/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { readImageForm } from "~/server/uploads/read-image-form";
import {
  ImageValidationError,
  uploadCategoryImage,
  logStorageError,
} from "~/server/integrations/product-images";

export async function POST(request: Request) {
  try {
    const origin = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
    if (request.headers.get("origin") !== origin)
      return Response.json({ error: "Origen no permitido." }, { status: 403 });
    const caller = createCaller(
      await createTRPCContext({ headers: request.headers }),
    );
    await caller.admin.currentUser();
    const form = await readImageForm(request);
    const id = categoryIdSchema.safeParse(form.get("categoryId"));
    const file = form.get("file");
    if (!id.success || !(file instanceof File))
      throw new ImageValidationError("Seleccioná una imagen válida.");
    const imageKey = await uploadCategoryImage(id.data, file);
    return Response.json({ imageKey });
  } catch (error) {
    if (error instanceof ImageValidationError)
      return Response.json({ error: error.message }, { status: 400 });
    if (
      error instanceof TRPCError &&
      ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
    )
      return Response.json(
        { error: "Necesitás una sesión de administrador." },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    logStorageError(error);
    return Response.json(
      {
        error:
          "No se pudo subir la imagen. Revisá la conexión con S3 e intentá nuevamente.",
      },
      { status: 503 },
    );
  }
}
