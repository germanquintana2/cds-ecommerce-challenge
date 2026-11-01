import { randomBytes } from "node:crypto";

export function localDefaults(existing = {}) {
  const env = { ...existing };
  const set = (key, value) => {
    if (!env[key] || env[key].startsWith("replace-with")) env[key] = value;
  };
  set("POSTGRES_USER", "cds");
  set("POSTGRES_PASSWORD", randomBytes(16).toString("hex"));
  set("POSTGRES_DB", "cds_ecommerce");
  set("POSTGRES_PORT", "5433");
  const url = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@localhost:${env.POSTGRES_PORT}/${encodeURIComponent(env.POSTGRES_DB)}`;
  if (
    !env.DATABASE_URL ||
    env.DATABASE_URL.includes("replace-with-local-password")
  )
    env.DATABASE_URL = url;
  set("TEST_DATABASE_URL", `${url}_test`);
  set("BETTER_AUTH_SECRET", randomBytes(32).toString("hex"));
  set("BETTER_AUTH_URL", "http://localhost:3100");
  set("ADMIN_EMAIL", "admin@example.com");
  set("ADMIN_PASSWORD", randomBytes(16).toString("hex"));
  set("ADMIN_NAME", "Administrador CDS");
  set("AWS_REGION", "us-east-2");
  return env;
}

function quoteEnv(value) {
  for (const quote of ["'", '"', "`"])
    if (!value.includes(quote)) return `${quote}${value}${quote}`;
  throw new Error(
    "Un valor de .env contiene todos los tipos de comillas. Conservá ese valor en un archivo de entorno compatible antes de continuar.",
  );
}

export function renderEnv(original, values) {
  const remaining = new Map(Object.entries(values));
  const lines = original.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !remaining.has(match[1])) return line;
    const value = remaining.get(match[1]);
    remaining.delete(match[1]);
    return `${match[1]}=${quoteEnv(value)}`;
  });
  for (const [key, value] of remaining) lines.push(`${key}=${quoteEnv(value)}`);
  return `${lines.join("\n").trimEnd()}\n`;
}

export function validateConfiguration(env) {
  const problems = [];
  for (const key of ["AWS_REGION", "S3_BUCKET_NAME", "STRIPE_SECRET_KEY"])
    if (!env[key]) problems.push(`Falta ${key}.`);
  if (env.STRIPE_SECRET_KEY && !/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY))
    problems.push("STRIPE_SECRET_KEY debe ser una clave de prueba.");
  if ((env.ADMIN_PASSWORD ?? "").length < 12 || env.ADMIN_PASSWORD.length > 128)
    problems.push("ADMIN_PASSWORD debe tener entre 12 y 128 caracteres.");
  if ((env.BETTER_AUTH_SECRET ?? "").length < 32)
    problems.push("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");
  if (env.BETTER_AUTH_URL !== "http://localhost:3100")
    problems.push(
      "Para el instalador local, BETTER_AUTH_URL debe ser http://localhost:3100.",
    );
  try {
    const db = new URL(env.DATABASE_URL);
    if (
      !["postgres:", "postgresql:"].includes(db.protocol) ||
      !["localhost", "127.0.0.1"].includes(db.hostname)
    )
      problems.push("El instalador solo prepara PostgreSQL local.");
    if (
      decodeURIComponent(db.username) !== env.POSTGRES_USER ||
      decodeURIComponent(db.password) !== env.POSTGRES_PASSWORD ||
      db.port !== env.POSTGRES_PORT ||
      decodeURIComponent(db.pathname.slice(1)) !== env.POSTGRES_DB
    )
      problems.push(
        "DATABASE_URL debe coincidir con POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT y POSTGRES_DB.",
      );
  } catch {
    problems.push("DATABASE_URL inválida.");
  }
  return problems;
}
