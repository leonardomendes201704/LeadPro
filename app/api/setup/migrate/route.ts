import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSupabaseProjectRef,
  runSqlMigration,
} from "@/lib/supabase/postgres-connection";

async function isSchemaReady() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("scrape_jobs").select("id").limit(1);
  return !error;
}

export async function GET() {
  const ready = await isSchemaReady();

  return NextResponse.json({
    ready,
    message: ready
      ? "Database schema is ready"
      : "Migration pendente — aplique o SQL ou use a senha do banco",
  });
}

export async function POST(request: Request) {
  if (await isSchemaReady()) {
    return NextResponse.json({ ok: true, message: "Schema already ready" });
  }

  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string"
      ? body.password
      : process.env.SUPABASE_DB_PASSWORD;

  const projectRef = getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!password || !projectRef) {
    return NextResponse.json(
      {
        error:
          "Informe a senha do banco ou configure SUPABASE_DB_PASSWORD / DATABASE_URL.",
      },
      { status: 400 },
    );
  }

  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_initial.sql"),
    "utf8",
  );

  try {
    await runSqlMigration({ projectRef, password, sql });
    return NextResponse.json({ ok: true, message: "Migration applied" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to apply migration",
      },
      { status: 500 },
    );
  }
}
