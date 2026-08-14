"use client";

import { useState } from "react";

export function SetupMigrationPanel({
  initialReady,
  initialMessage,
}: {
  initialReady: boolean;
  initialMessage: string;
}) {
  const [ready, setReady] = useState(initialReady);
  const [message, setMessage] = useState(initialMessage);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function applyMigration(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Aplicando migration...");

    try {
      const response = await fetch("/api/setup/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao aplicar migration");
      }

      setReady(true);
      setMessage("Migration aplicada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (ready) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        Banco pronto. Você já pode criar conta e iniciar buscas.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <p className="font-medium">Configuração inicial do banco</p>
      <p className="text-sm">{message}</p>
      <p className="text-sm">
        Informe a senha do banco criada no Supabase (Settings → Database) para
        aplicar a migration automaticamente.
      </p>

      <form onSubmit={applyMigration} className="flex flex-wrap gap-3">
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha do banco Supabase"
          className="min-w-[260px] flex-1 rounded-xl border border-amber-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
        >
          {loading ? "Aplicando..." : "Aplicar migration"}
        </button>
      </form>
    </div>
  );
}
