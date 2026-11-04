/** Limits bytes while streaming, including bodies without a trustworthy Content-Length. */
export async function readJsonBody(
  request: Request,
  limit = 32_768,
): Promise<
  { value: unknown; response?: never } | { value?: never; response: Response }
> {
  const failure = (status: number, error: string) => ({
    response: Response.json(
      { error },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  });
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > limit) {
    await request.body?.cancel().catch(() => {});
    return failure(413, "Solicitação muito grande.");
  }
  if (!request.body) return failure(400, "Dados inválidos.");
  const reader = request.body.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        return failure(413, "Solicitação muito grande.");
      }
      chunks.push(value);
    }
    return { value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return failure(400, "Dados inválidos.");
  } finally {
    reader.releaseLock();
  }
}
