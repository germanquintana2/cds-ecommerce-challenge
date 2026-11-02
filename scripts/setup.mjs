import { spawn } from "node:child_process";
import { readFile, writeFile, rename, chmod } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  localDefaults,
  renderEnv,
  validateConfiguration,
} from "./setup/config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const nonInteractive = process.argv.includes("--non-interactive");
const checkOnly = process.argv.includes("--check");
let child;
process.on("SIGINT", () => {
  child?.kill("SIGTERM");
  process.exit(130);
});
process.on("SIGTERM", () => {
  child?.kill("SIGTERM");
  process.exit(143);
});
async function run(command, args, env, capture = false) {
  return new Promise((resolve, reject) => {
    const current = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false,
    });
    child = current;
    let output = "";
    current.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    // Captured commands may emit secrets; never echo their stderr on failure.
    current.stderr?.on("data", () => {});
    current.once("error", () =>
      reject(
        new Error(
          `No se pudo ejecutar ${command}. Comprobá que esté instalado y disponible en PATH.`,
        ),
      ),
    );
    current.once("close", (code) => {
      if (child === current) child = undefined;
      if (code === 0) resolve(output.trim());
      else
        reject(
          new Error(
            `Falló ${command} ${args.slice(0, 2).join(" ")}. Revisá su configuración y volvé a ejecutar setup.`,
          ),
        );
    });
  });
}
async function question(label, fallback = "", secret = false) {
  if (!process.stdin.isTTY || nonInteractive)
    throw new Error(
      `Configurá ${label} en .env y volvé a ejecutar bun run setup.`,
    );
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!secret) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(`${label}${fallback ? ` [${fallback}]` : ""}: `);
  try {
    return (await rl.question("")).trim() || fallback;
  } finally {
    rl.close();
    if (secret) process.stdout.write("\n");
  }
}
async function save(original, env) {
  const temporary = new URL("../.env.setup.tmp", import.meta.url);
  await writeFile(temporary, renderEnv(original, env), { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, new URL("../.env", import.meta.url));
}
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("El instalador requiere Node.js 24 o superior.");
  console.log("Verificando Bun, Docker y Stripe CLI…");
  await run("bun", ["--version"], {}, true);
  await run("docker", ["compose", "version"], {}, true);
  await run("docker", ["info"], {}, true);
  await run("stripe", ["--version"], {}, true);
  let original = "";
  try {
    original = await readFile(new URL("../.env", import.meta.url), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const existing = parseEnv(original);
  const env = localDefaults(existing);
  if (!env.S3_BUCKET_NAME)
    env.S3_BUCKET_NAME = await question(
      "S3_BUCKET_NAME (bucket existente con acceso de lectura/escritura)",
    );
  // Existing profiles and region are never replaced by template values.
  if (!original && !nonInteractive && process.stdin.isTTY) {
    env.AWS_REGION = await question("AWS_REGION", env.AWS_REGION);
    const profile = await question("AWS_PROFILE (Enter para usar default)");
    if (profile) env.AWS_PROFILE = profile;
  }
  if (!env.STRIPE_SECRET_KEY)
    env.STRIPE_SECRET_KEY = await question(
      "STRIPE_SECRET_KEY (clave de prueba, entrada oculta)",
      "",
      true,
    );
  const problems = validateConfiguration(env);
  if (problems.length) throw new Error(problems.join("\n"));
  if (!checkOnly) await save(original, env);
  if (!checkOnly) console.log("Instalando dependencias…");
  if (!checkOnly) await run("bun", ["install", "--frozen-lockfile"], env);
  console.log("Verificando acceso a S3 y Stripe (sin realizar pagos)…");
  await run("bun", ["scripts/setup/verify-services.ts"], env);
  const secretOutput = await run(
    "stripe",
    ["listen", "--print-secret"],
    { ...env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
    true,
  );
  const secret = secretOutput.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (!secret)
    throw new Error(
      "Stripe no devolvió un secreto del listener. Revisá el acceso de la clave de prueba.",
    );
  if (checkOnly) {
    console.log(
      "Accesos verificados. No se modificó .env, la base de datos ni S3.",
    );
    return;
  }
  env.STRIPE_WEBHOOK_SECRET = secret;
  await save(original, env);
  console.log("Preparando PostgreSQL, migraciones y administrador…");
  await run(
    "docker",
    ["compose", "-f", "compose.database.yaml", "up", "-d", "--wait"],
    env,
  );
  await run("bun", ["run", "db:generate"], env);
  await run("bun", ["run", "db:deploy"], env);
  await run("bun", ["run", "db:seed"], env);
  console.log("Cargando catálogo e imágenes en el bucket configurado…");
  await run("bun", ["run", "db:seed:catalog"], env);
  console.log(
    "Instalación completa. Credenciales del administrador guardadas en .env (ADMIN_EMAIL y ADMIN_PASSWORD).\nIniciá la tienda con: bun run dev:payments\nAbrí http://localhost:3100. No se borraron datos existentes.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
