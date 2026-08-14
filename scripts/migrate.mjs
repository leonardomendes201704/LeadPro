import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  const sqlPath = resolve(process.cwd(), "supabase/migrations/001_initial.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const statement of statements) {
    const { error } = await supabase.rpc("exec_sql", { query: statement });
    if (error && !error.message.includes("Could not find the function")) {
      console.error("Statement failed:", statement.slice(0, 80), error.message);
    }
  }

  console.log(
    "Migration file prepared. If RPC is unavailable, run SQL manually in Supabase SQL editor.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
