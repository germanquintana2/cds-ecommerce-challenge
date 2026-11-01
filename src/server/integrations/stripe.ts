import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_test_/.test(key))
    throw new Error("Configurá una clave de pruebas de Stripe en el servidor.");
  return (client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 }));
}
