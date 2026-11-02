import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const config = JSON.parse(await readFile("/runtime/config.json", "utf8"));
const env = { ...process.env, ...config };
// AWS CLI and the SDK share a Linux session volume, independent of the host.
let child;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child?.kill(signal));
async function run(command, args) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, { env, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} terminó con código ${code}.`)),
    );
  });
}
try {
  if (process.argv[2] === "init") {
    await run("bun", ["scripts/setup/verify-services.ts"]);
    await run("bun", ["run", "db:deploy"]);
    await run("bun", ["run", "db:seed"]);
    await run("bun", ["run", "db:seed:catalog"]);
    console.log("Base y catálogo con fotos preparados.");
  } else if (process.argv[2] === "credentials") {
    console.log(
      `Administrador: ${env.ADMIN_EMAIL}\nContraseña: ${env.ADMIN_PASSWORD}`,
    );
  } else {
    await run("node", ["scripts/dev-with-payments.mjs"]);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
