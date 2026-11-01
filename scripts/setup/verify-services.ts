import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import Stripe from "stripe";

const client = new S3Client({ region: process.env.AWS_REGION, maxAttempts: 2 });
try {
  await client.send(
    new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }),
  );
} catch (error) {
  console.error(
    "No se pudo acceder al bucket S3:",
    error instanceof Error ? error.name : "UnknownError",
  );
  console.error(
    "Revisá AWS_PROFILE, AWS_REGION, S3_BUCKET_NAME y renová la sesión de tu perfil. Volvé a ejecutar setup después de autenticarte.",
  );
  process.exitCode = 1;
} finally {
  client.destroy();
}
if (!process.exitCode) {
  try {
    if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? ""))
      throw new Error("TestKeyRequired");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.checkout.sessions.list({ limit: 1 });
    console.log("S3 y Stripe de prueba accesibles.");
  } catch (error) {
    console.error(
      "No se pudo verificar Stripe:",
      error instanceof Error ? error.name : "UnknownError",
    );
    console.error(
      "Configurá una clave de prueba con acceso a Checkout Sessions.",
    );
    process.exitCode = 1;
  }
}
