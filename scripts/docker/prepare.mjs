import { mkdir, writeFile, rename } from "node:fs/promises";
import { localDefaults } from "../setup/config.mjs";

const directory = process.env.CDS_RUNTIME_DIR ?? "/runtime";
const supplied = {};
for (const key of [
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
  "AWS_REGION",
  "AWS_PROFILE",
  "S3_BUCKET_NAME",
  "STRIPE_SECRET_KEY",
])
  if (process.env[key]) supplied[key] = process.env[key];
if (
  !supplied.AWS_REGION ||
  !supplied.S3_BUCKET_NAME ||
  !/^(sk|rk)_test_/.test(supplied.STRIPE_SECRET_KEY ?? "")
) {
  console.error(
    "Configurá AWS_REGION, S3_BUCKET_NAME y STRIPE_SECRET_KEY de prueba en .env.",
  );
  process.exit(1);
}
// Keep generated credentials stable across compose up/down and rebuilds.
const { readFile } = await import("node:fs/promises");
let previous = {};
try {
  previous = JSON.parse(await readFile(`${directory}/config.json`, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const env = localDefaults({ ...previous, ...supplied });
env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@postgres:5432/${encodeURIComponent(env.POSTGRES_DB)}`;
env.CDS_MANAGED_DOCKER = "1";
env.CDS_APP_MODE = "production";
if (
  env.ADMIN_PASSWORD.length < 12 ||
  env.ADMIN_PASSWORD.length > 128 ||
  env.BETTER_AUTH_SECRET.length < 32
)
  throw new Error(
    "Las credenciales locales configuradas no cumplen las longitudes mínimas.",
  );
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(`${directory}/config.tmp`, JSON.stringify(env), {
  mode: 0o600,
});
await rename(`${directory}/config.tmp`, `${directory}/config.json`);
await writeFile(`${directory}/postgres-password`, env.POSTGRES_PASSWORD, {
  mode: 0o600,
});
console.log(
  "Configuración Docker preparada. Secretos conservados en el volumen privado de configuración.",
);
