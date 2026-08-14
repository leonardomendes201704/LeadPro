import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          LeadPro
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
          Extraia empresas do Google Maps e salve leads no Supabase.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600">
          Busque por segmento e cidade, rode a extração em background com
          Inngest e acompanhe os resultados em tempo real.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
