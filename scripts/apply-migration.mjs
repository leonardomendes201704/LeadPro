import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];

  let connectionString = databaseUrl;

  if (!connectionString && dbPassword && projectRef) {
    connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  }

  if (!connectionString) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local to apply migrations automatically.",
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

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log("Migration applied successfully.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
