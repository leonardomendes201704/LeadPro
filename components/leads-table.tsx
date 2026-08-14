"use client";

import { useMemo, useState } from "react";
import type { Lead, ScrapeJob } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";

function toCsvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function LeadsTable({
  initialLeads,
  jobs,
}: {
  initialLeads: Lead[];
  jobs: ScrapeJob[];
}) {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((lead) => {
      const matchesJob = jobFilter === "all" || lead.job_id === jobFilter;
      const haystack = [
        lead.name,
        lead.address,
        lead.phone,
        lead.website,
        lead.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        search.trim().length === 0 ||
        haystack.includes(search.trim().toLowerCase());
      return matchesJob && matchesSearch;
    });
  }, [initialLeads, jobFilter, search]);

  function exportCsv() {
    const headers = [
      "name",
      "address",
      "phone",
      "website",
      "rating",
      "review_count",
      "category",
      "maps_url",
      "created_at",
    ];

    const rows = filteredLeads.map((lead) =>
      [
        lead.name,
        lead.address,
        lead.phone,
        lead.website,
        lead.rating,
        lead.review_count,
        lead.category,
        lead.maps_url,
        lead.created_at,
      ]
        .map(toCsvValue)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "leadpro-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar por nome, endereço, telefone..."
          className="min-w-[260px] flex-1 rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
        />

        <select
          value={jobFilter}
          onChange={(event) => setJobFilter(event.target.value)}
          className="rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="all">Todos os jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.query} · {job.location}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={exportCsv}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Capturado</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-zinc-100">
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-zinc-900">{lead.name}</div>
                      <div className="mt-1 text-zinc-500">{lead.address ?? "—"}</div>
                      {lead.maps_url && (
                        <a
                          href={lead.maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-emerald-700 hover:underline"
                        >
                          Ver no Maps
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-600">
                      <div>{lead.phone ?? "—"}</div>
                      <div>{lead.website ?? "—"}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {lead.rating ?? "—"}
                      {lead.review_count ? ` (${lead.review_count})` : ""}
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-600">
                      {lead.category ?? "—"}
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-500">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
