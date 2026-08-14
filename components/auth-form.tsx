"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage("Conta criada. Verifique seu e-mail ou faça login.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          LeadPro
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {mode === "login" ? "Entrar na conta" : "Criar conta"}
        </h1>
        <p className="text-sm text-zinc-500">
          Extraia empresas do Google Maps e salve no Supabase.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">Nome</span>
            <input
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Seu nome"
            />
          </label>
        )}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">E-mail</span>
          <input
            type="email"
            required
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Senha</span>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>

        {message && (
          <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700",
            loading && "cursor-not-allowed opacity-70",
          )}
        >
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-emerald-700 hover:underline"
        >
          {mode === "login" ? "Cadastre-se" : "Faça login"}
        </Link>
      </p>
    </div>
  );
}
