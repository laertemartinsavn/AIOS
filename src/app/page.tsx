import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">AIOS</h1>
      <p className="text-gray-600">Sistema operacional de IA</p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-black px-4 py-2 text-white">
          Entrar
        </Link>
        <Link href="/cadastro" className="rounded border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:text-white">
          Criar conta
        </Link>
      </div>
    </main>
  );
}
