import "dotenv/config";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline";

if (
  !process.env.STRIPE_WEBHOOK_SECRET ||
  !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")
) {
  console.error("Configurá las claves de prueba de Stripe en .env.");
  process.exit(1);
}
// Do not start a second app or leave a listener behind when the port is occupied.
await new Promise((resolve) => {
  const probe = createServer();
  probe.once("error", () => {
    console.error(
      "El puerto 3100 está ocupado. Detené el servidor actual antes de ejecutar bun run dev:payments.",
    );
    process.exit(1);
  });
  probe.listen(3100, () => probe.close(resolve));
});

const children = new Set();
let stopping = false;
let appStarted = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timeout);
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
function launch(command, args, options) {
  const child = spawn(command, args, options);
  children.add(child);
  child.on("error", () => {
    console.error(
      `No se pudo iniciar ${command}. Comprobá que esté instalado.`,
    );
    stop(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    if (!stopping) {
      console.error(
        `${command} terminó; se detiene el entorno para evitar pagos sin listener.`,
      );
      stop(code || 1);
    }
  });
  return child;
}
const timeout = setTimeout(() => {
  console.error(
    "Stripe no quedó listo. Revisá la conexión o ejecutá stripe login.",
  );
  stop(1);
}, 45000);
const listener = launch(
  "stripe",
  [
    "listen",
    "--events",
    "checkout.session.completed,checkout.session.expired",
    "--forward-to",
    "http://localhost:3100/api/webhooks/stripe",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY },
  },
);
for (const stream of [listener.stdout, listener.stderr]) {
  createInterface({ input: stream }).on("line", (line) => {
    const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0];
    console.log(line.replace(/whsec_[A-Za-z0-9]+/g, "[secreto oculto]"));
    if (!secret || appStarted || stopping) return;
    if (secret !== process.env.STRIPE_WEBHOOK_SECRET) {
      console.error(
        "El secreto del listener no coincide con STRIPE_WEBHOOK_SECRET. Actualizalo localmente y volvé a iniciar.",
      );
      stop(1);
      return;
    }
    clearTimeout(timeout);
    appStarted = true;
    console.log(
      "Listener verificado. Iniciando la tienda con pagos de prueba.",
    );
    launch("bun", ["run", "dev"], { stdio: "inherit" });
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
