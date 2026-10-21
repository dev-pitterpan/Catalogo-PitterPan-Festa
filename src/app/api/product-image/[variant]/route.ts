import { database, usesDatabase } from "../../../../server/database/client";
import { activeSnapshot } from "../../../../server/database/catalog-repository";
import { shopifyImageUrl } from "../../../../server/shopify/media";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  if (!usesDatabase() || !/^[1-9]\d{0,24}$/.test(variant))
    return new Response(null, { status: 404 });
  try {
    const db = database();
    const snapshot = await activeSnapshot(db);
    const { rows } = await db.query<{ image_url: string }>(
      "SELECT image_url FROM catalog_items WHERE import_id=$1 AND variant_id=$2",
      [snapshot, variant],
    );
    const source = shopifyImageUrl(rows[0]?.image_url);
    if (!source) return new Response(null, { status: 404 });
    const upstream = await fetch(source, {
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
    const type = upstream.headers.get("content-type")?.split(";")[0];
    if (
      !upstream.ok ||
      !type ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
      ].includes(type)
    )
      return new Response(null, { status: 502 });
    if (!upstream.body) return new Response(null, { status: 502 });
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 15_000_000) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
