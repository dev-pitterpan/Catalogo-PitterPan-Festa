import { catalogBannerSvg } from "../../../../lib/catalog/visual";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (slug.length > 200) return new Response(null, { status: 400 });
  return new Response(catalogBannerSvg(slug), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
