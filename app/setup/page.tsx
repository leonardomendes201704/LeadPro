import Link from "next/link";
import { SetupMigrationPanel } from "@/components/setup-migration-panel";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SetupPage() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("scrape_jobs").select("id").limit(1);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          LeadPro Setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Configuração inicial</h1>
      </div>

      <SetupMigrationPanel
        initialReady={!error}
        initialMessage={
          error?.message ??
          "Banco configurado. Você pode seguir para login e criar buscas."
        }
      />

      <Link
        href="/signup"
        className="inline-flex w-fit rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        Ir para cadastro
      </Link>
    </main>
  );
}
