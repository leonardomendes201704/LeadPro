import pg from "pg";

const POOLER_REGIONS = [
  "sa-east-1",
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
] as const;

export function getSupabaseProjectRef(supabaseUrl?: string) {
  return supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

export function buildSupabasePostgresConnectionCandidates(
  projectRef: string,
  password: string,
) {
  const encodedPassword = encodeURIComponent(password);
  const candidates: string[] = [];

  if (process.env.DATABASE_URL) {
    candidates.push(process.env.DATABASE_URL);
  }

  // Direct connection — best for one-off migrations (IPv6 on Supabase).
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

function maskConnectionString(connectionString: string) {
  return connectionString.replace(/:([^:@/]+)@/, ":***@");
}

export async function connectToSupabasePostgres(options: {
  projectRef: string;
  password: string;
}) {
  const candidates = buildSupabasePostgresConnectionCandidates(
    options.projectRef,
    options.password,
  );

  const failures: string[] = [];

  for (const connectionString of candidates) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    });

    try {
      await client.connect();
      return { client, connectionString: maskConnectionString(connectionString) };
    } catch (error) {
      failures.push(
        `${maskConnectionString(connectionString)} → ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      );
      await client.end().catch(() => undefined);
    }
  }

  throw new Error(
    `Não foi possível conectar ao Postgres do Supabase. Verifique a senha do banco ou aplique o SQL manualmente no dashboard. Detalhes: ${failures.slice(0, 2).join(" | ")}`,
  );
}

export async function runSqlMigration(options: {
  projectRef: string;
  password: string;
  sql: string;
}) {
  const { client } = await connectToSupabasePostgres(options);

  try {
    await client.query(options.sql);
  } finally {
    await client.end().catch(() => undefined);
  }
}
