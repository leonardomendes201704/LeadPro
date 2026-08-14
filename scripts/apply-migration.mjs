import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const POOLER_REGIONS = [
  "sa-east-1",
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
];

function getSupabaseProjectRef(supabaseUrl) {
  return supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

function buildCandidates(projectRef, password) {
  const encodedPassword = encodeURIComponent(password);
  const candidates = [];

  if (process.env.DATABASE_URL) {
    candidates.push(process.env.DATABASE_URL);
  }

  candidates.push(
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  );

  for (const region of POOLER_REGIONS) {
    for (const prefix of ["aws-0", "aws-1"]) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      candidates.push(
        `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:5432/postgres`,
      );
      candidates.push(
        `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:6543/postgres`,
      );
    }
  }

  return [...new Set(candidates)];
}

async function main() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!projectRef) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL inválida ou ausente.");
  }

  if (!dbPassword && !process.env.DATABASE_URL) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local to apply migrations automatically.",
    );
  }

  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_initial.sql"),
    "utf8",
  );

  const candidates = process.env.DATABASE_URL
    ? [process.env.DATABASE_URL]
    : buildCandidates(projectRef, dbPassword);

  let lastError = null;

  for (const connectionString of candidates) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    });

    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("Migration applied successfully.");
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }

  throw lastError ?? new Error("Failed to apply migration");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
