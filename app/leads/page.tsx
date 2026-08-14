import { AppShell } from "@/components/app-shell";
import { LeadsTable } from "@/components/leads-table";
import { createClient } from "@/lib/supabase/server";
import type { Lead, ScrapeJob } from "@/lib/types/database";

export default async function LeadsPage() {
  const supabase = await createClient();

  const [{ data: leads, error: leadsError }, { data: jobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("scrape_jobs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  if (leadsError || jobsError) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Erro ao carregar leads: {leadsError?.message ?? jobsError?.message}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-zinc-500">
          Empresas extraídas das suas buscas no Google Maps.
        </p>
      </div>
      <LeadsTable
        initialLeads={(leads ?? []) as Lead[]}
        jobs={(jobs ?? []) as ScrapeJob[]}
      />
    </AppShell>
  );
}
