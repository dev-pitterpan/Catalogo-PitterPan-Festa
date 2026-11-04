import { redirect } from "next/navigation";
import { requireSession } from "@shared/server/auth/session";
/** Preserve existing bookmarks while keeping the history inside sales. */
export default async function SoldProductsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession(["admin", "gestor"]);
  const source = await searchParams;
  const params = new URLSearchParams();
  for (const key of [
    "days",
    "start",
    "end",
    "status",
    "fulfillment",
    "category",
    "delivery",
  ]) {
    const value = source[key];
    if (typeof value === "string") params.set(key, value);
  }
  redirect(`/gestor/vendas/?${params}#sold-products`);
}
