export default function Loading() {
  return (
    <main
      className="min-h-dvh flex flex-col gap-3 items-center justify-center font-sans bg-[#081019] text-white"
      role="status"
    >
      <strong>Carregando o catálogo solicitado…</strong>
      <p>Buscando produtos na Shopify. Aguarde a conclusão.</p>
    </main>
  );
}
