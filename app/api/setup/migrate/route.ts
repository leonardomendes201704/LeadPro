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

export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("scrape_jobs").select("id").limit(1);

  return NextResponse.json({
    ready: !error,
    message: error?.message ?? "Database schema is ready",
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const connectionString = getConnectionString(
    typeof body.password === "string" ? body.password : undefined,
  );

  if (!connectionString) {
    return NextResponse.json(
      {
        error:
          "Configure SUPABASE_DB_PASSWORD or DATABASE_URL, or send { password } in the request body.",
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
