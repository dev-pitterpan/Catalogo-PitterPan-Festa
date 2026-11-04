import { readJsonBody } from "../../body";
import { z } from "zod";
import { getSelectedProducts, getConfig } from "../../../catalogs";
import { CheckoutError, prepareCheckout } from "../../../../lib/checkout";

export const runtime = "nodejs";
const inputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body.response) return body.response;
  const parsed = inputSchema.safeParse(body.value);
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Seleção inválida. Selecione até 100 itens, com quantidades de 1 a 999.",
      },
      { status: 400 },
    );
  try {
    const [products, config] = await Promise.all([
      getSelectedProducts(parsed.data.items.map((item) => item.id)),
      getConfig(),
    ]);
    const checkoutUrl = prepareCheckout(
      parsed.data.items,
      products,
      config.brand.website,
    );
    return Response.json(
      { checkoutUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CheckoutError)
      return Response.json({ error: error.message }, { status: 422 });
    console.error("catalog_checkout_failed");
    return Response.json(
      {
        error:
          "Não foi possível preparar a compra. Tente novamente em instantes.",
      },
      { status: 500 },
    );
  }
}
