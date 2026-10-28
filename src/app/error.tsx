"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 font-sans text-center">
      <h1>Não foi possível carregar o catálogo</h1>
      <p>
        A conexão com a Shopify pode estar temporariamente indisponível. Tente
        novamente em instantes.
      </p>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  );
}
