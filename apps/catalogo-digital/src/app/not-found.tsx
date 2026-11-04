import Link from "next/link";
export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 font-sans text-center">
      <h1>Página não encontrada</h1>
      <p>Este catálogo não está disponível.</p>
      <Link href="/">Voltar aos catálogos</Link>
    </main>
  );
}
