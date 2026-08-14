import { NextResponse } from "next/server";
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";

function getConnectionString(password?: string) {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const dbPassword = password ?? process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];

  if (!dbPassword || !projectRef) {
    return null;
  }

  return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
}

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
  const connectionString = getConnectionString(
    typeof body.password === "string" ? body.password : undefined,
  );

  if (!connectionString) {
    return NextResponse.json(
      {
        error:
          "Configure SUPABASE_DB_PASSWORD ou DATABASE_URL, ou envie { password } no body.",
      },
      { status: 400 },
    );
  }

  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_initial.sql"),
    "utf8",
  );

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "Migration applied" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to apply migration",
      },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
