"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, maxResults }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao criar busca");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Erro inesperado",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Nova busca no Google Maps</h1>
        <p className="text-sm text-zinc-500">
          A extração roda em background via Inngest. Você pode fechar esta
          página e acompanhar no dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-700">
            Tipo de empresa
          </span>
          <input
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: dentista, restaurante, academia"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-700">Local</span>
          <input
            required
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ex: São Paulo, Curitiba, Rio de Janeiro"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-700">
          Máximo de resultados
        </span>
        <input
          type="number"
          min={1}
          max={200}
          value={maxResults}
          onChange={(event) => setMaxResults(Number(event.target.value))}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2 md:max-w-xs"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700",
          loading && "cursor-not-allowed opacity-70",
        )}
      >
        {loading ? "Iniciando busca..." : "Iniciar extração"}
      </button>
    </form>
  );
}
