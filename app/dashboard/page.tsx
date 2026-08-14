import { AppShell } from "@/components/app-shell";
import { JobsDashboard } from "@/components/jobs-dashboard";
import { createClient } from "@/lib/supabase/server";
import type { ScrapeJob } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Erro ao carregar jobs: {error.message}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Acompanhe buscas em background e o progresso em tempo real.
        </p>
      </div>
      <JobsDashboard initialJobs={(data ?? []) as ScrapeJob[]} />
    </AppShell>
  );
}
