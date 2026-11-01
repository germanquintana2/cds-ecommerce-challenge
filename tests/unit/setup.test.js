import { expect, test } from "bun:test";
import { parseEnv } from "node:util";
import {
  localDefaults,
  renderEnv,
  validateConfiguration,
} from "../../scripts/setup/config.mjs";

const external = {
  S3_BUCKET_NAME: "example-private-bucket",
  AWS_PROFILE: "example",
  STRIPE_SECRET_KEY: "sk_test_example",
};
test("setup generates consistent local secrets without copying candidate credentials", () => {
  const first = localDefaults();
  const second = localDefaults();
  expect(first.POSTGRES_PASSWORD).not.toBe(second.POSTGRES_PASSWORD);
  expect(first.BETTER_AUTH_SECRET).not.toBe(second.BETTER_AUTH_SECRET);
  expect(first.ADMIN_PASSWORD.length).toBeGreaterThanOrEqual(12);
  expect(first.S3_BUCKET_NAME).toBeUndefined();
  expect(first.AWS_PROFILE).toBeUndefined();
  expect(validateConfiguration({ ...first, ...external })).toEqual([]);
});
test("setup preserves existing data access and admin credentials on repeat", () => {
  const env = { ...localDefaults(), ...external };
  expect(localDefaults(env)).toEqual(env);
  const original = "# Local settings\nOTHER_KEY=keep\n" + renderEnv("", env);
  const rendered = renderEnv(original, env);
  expect(parseEnv(rendered)).toEqual({ OTHER_KEY: "keep", ...env });
  expect(rendered).toContain("# Local settings");
});
test("setup replaces placeholders and safely serializes characters used in secrets", () => {
  const env = localDefaults({
    POSTGRES_PASSWORD: "replace-with-local-password",
    DATABASE_URL:
      "postgresql://cds:replace-with-local-password@localhost:5433/cds_ecommerce",
  });
  expect(env.DATABASE_URL).not.toContain("replace-with");
  const values = { VALUE: 'a # $ ` \\ " secret' };
  expect(parseEnv(renderEnv("VALUE=old\n", values))).toEqual(values);
});
test("setup rejects live Stripe keys, remote databases and inconsistent DB settings", () => {
  const valid = { ...localDefaults(), ...external };
  expect(
    validateConfiguration({ ...valid, STRIPE_SECRET_KEY: "sk_live_example" })
      .length,
  ).toBeGreaterThan(0);
  expect(
    validateConfiguration({
      ...valid,
      DATABASE_URL: valid.DATABASE_URL.replace("localhost", "example.com"),
    }).length,
  ).toBeGreaterThan(0);
  expect(
    validateConfiguration({ ...valid, POSTGRES_PASSWORD: "different" }).length,
  ).toBeGreaterThan(0);
});
