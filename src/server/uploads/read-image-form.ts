import { ImageValidationError } from "~/server/integrations/product-images";

const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

export async function readImageForm(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data"))
    throw new ImageValidationError(
      "Enviá la imagen como formulario multipart.",
    );
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES)
    throw new ImageValidationError("El archivo supera el tamaño permitido.");
  const reader = request.body?.getReader();
  if (!reader) throw new ImageValidationError("No se recibió una imagen.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ImageValidationError(
          "El archivo supera el tamaño permitido.",
        );
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new ImageValidationError("No se pudo leer el archivo enviado.");
  }
}
