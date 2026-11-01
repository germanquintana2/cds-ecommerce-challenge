import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutResult } from "./_components/checkout-result";

async function Result({ searchParams }: PageProps<"/checkout/result">) {
  const params = await searchParams;
  // Older Stripe sessions may still point to the previous cancellation URL.
  // Redirect on the server so the visible page and browser URL agree on reload.
  if (params.cancelled === "1") redirect("/");
  const id = typeof params.attempt === "string" ? params.attempt : "";
  return <CheckoutResult id={id} />;
}
export default function CheckoutResultPage(
  props: PageProps<"/checkout/result">,
) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Suspense fallback={<p>Consultando compra…</p>}>
        <Result {...props} />
      </Suspense>
    </main>
  );
}
