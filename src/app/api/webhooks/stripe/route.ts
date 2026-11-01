import { getStripe } from "~/server/integrations/stripe";
import { confirmSession } from "~/server/payments/confirm-session";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const stripe = getStripe();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode) return new Response("Test events only", { status: 400 });
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  )
    return Response.json({ received: true });
  try {
    // Do not rely on potentially stale event payloads or client success redirects.
    const session = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
    );
    await confirmSession(session);
    return Response.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return new Response("Processing failed; retry delivery", { status: 500 });
  }
}
