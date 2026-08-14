import Link from "next/link";
import { LogOut, MapPin, Search, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/dashboard", label: "Jobs", icon: MapPin },
  { href: "/search", label: "Nova busca", icon: Search },
  { href: "/leads", label: "Leads", icon: Table2 },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-lg font-semibold">
              LeadPro
            </Link>
            <p className="text-sm text-zinc-500">
              Extração de empresas do Google Maps
            </p>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-2 md:flex">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
        {user && (
          <p className="mx-auto max-w-6xl px-6 pb-3 text-xs text-zinc-400">
            Logado como {user.email}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
