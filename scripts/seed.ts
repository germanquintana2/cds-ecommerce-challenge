import "dotenv/config";
import { z } from "zod";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const seedSchema = z.object({
  ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12).max(128),
  ADMIN_NAME: z.string().trim().min(2).max(100).default("Administrador CDS"),
});

async function main() {
  const result = seedSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      "Configurá ADMIN_EMAIL y ADMIN_PASSWORD (12 a 128 caracteres) en .env antes de ejecutar el seed.",
    );
  }

  const {
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD: password,
    ADMIN_NAME: name,
  } = result.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error(
        "El email del administrador ya pertenece a un cliente. Elegí otro email.",
      );
    }
    console.log("El administrador ya existe; se conservaron sus credenciales.");
    return;
  }

  // Better Auth owns password hashing and its account schema.
  const { user } = await auth.api.signUpEmail({
    body: { email, password, name },
  });
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  // Signup can create a session. A seed should leave no authenticated session behind.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(
    "Administrador creado. Usá las credenciales de tu .env local para ingresar.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo preparar el administrador.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
