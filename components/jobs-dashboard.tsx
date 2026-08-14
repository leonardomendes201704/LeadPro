"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScrapeJob } from "@/lib/types/database";
import { cn, formatDate } from "@/lib/utils";

const statusLabels: Record<ScrapeJob["status"], string> = {
  pending: "Pendente",
  running: "Executando",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const statusColors: Record<ScrapeJob["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export function JobsDashboard({ initialJobs }: { initialJobs: ScrapeJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("scrape-jobs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scrape_jobs" },
        (payload) => {
          const nextJob = payload.new as ScrapeJob;
          setJobs((current) => {
            const exists = current.some((job) => job.id === nextJob.id);
            if (exists) {
              return current.map((job) =>
                job.id === nextJob.id ? nextJob : job,
              );
            }
            return [nextJob, ...current];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function cancelJob(jobId: string) {
    setCancellingId(jobId);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: "PATCH" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Falha ao cancelar");
      }
    } finally {
      setCancellingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-lg font-medium">Nenhuma busca ainda</p>
        <p className="mt-2 text-sm text-zinc-500">
          Crie sua primeira busca para extrair empresas do Google Maps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <article
          key={job.id}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                {job.query} · {job.location}
              </h2>
              <p className="text-sm text-zinc-500">
                Criado em {formatDate(job.created_at)}
              </p>
            </div>

            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                statusColors[job.status],
              )}
            >
              {statusLabels[job.status]}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">Progresso</span>
              <span className="font-medium">
                {job.results_count}/{job.max_results} · {job.progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          {job.error_message && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {job.error_message}
            </p>
          )}

          {["pending", "running"].includes(job.status) && (
            <button
              type="button"
              onClick={() => cancelJob(job.id)}
              disabled={cancellingId === job.id}
              className="mt-4 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {cancellingId === job.id ? "Cancelando..." : "Cancelar busca"}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
