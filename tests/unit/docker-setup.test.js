import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("Docker bootstrap persists generated credentials and targets the internal database", () => {
  const directory = mkdtempSync(join(tmpdir(), "cds-docker-"));
  const env = {
    PATH: process.env.PATH,
    CDS_RUNTIME_DIR: directory,
    AWS_REGION: "us-east-2",
    S3_BUCKET_NAME: "test-bucket",
    STRIPE_SECRET_KEY: "sk_test_example",
  };
  try {
    const firstRun = spawnSync("node", ["scripts/docker/prepare.mjs"], {
      env,
      encoding: "utf8",
    });
    expect(firstRun.status).toBe(0);
    const first = JSON.parse(
      readFileSync(join(directory, "config.json"), "utf8"),
    );
    expect(new URL(first.DATABASE_URL).hostname).toBe("postgres");
    expect(readFileSync(join(directory, "postgres-password"), "utf8")).toBe(
      first.POSTGRES_PASSWORD,
    );
    expect(statSync(join(directory, "config.json")).mode & 0o777).toBe(0o600);
    expect(first.CDS_APP_MODE).toBe("production");
    const secondRun = spawnSync("node", ["scripts/docker/prepare.mjs"], {
      env,
      encoding: "utf8",
    });
    expect(secondRun.status).toBe(0);
    expect(
      JSON.parse(readFileSync(join(directory, "config.json"), "utf8")),
    ).toEqual(first);
    expect(firstRun.stdout).not.toContain(first.POSTGRES_PASSWORD);
    expect(firstRun.stdout).not.toContain(env.STRIPE_SECRET_KEY);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Docker bootstrap rejects live payments before writing configuration", () => {
  const directory = mkdtempSync(join(tmpdir(), "cds-docker-"));
  try {
    const result = spawnSync("node", ["scripts/docker/prepare.mjs"], {
      env: {
        PATH: process.env.PATH,
        CDS_RUNTIME_DIR: directory,
        AWS_REGION: "us-east-2",
        S3_BUCKET_NAME: "test-bucket",
        STRIPE_SECRET_KEY: "sk_live_example",
      },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain("sk_live_example");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
