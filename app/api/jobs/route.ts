import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

const createJobSchema = z.object({
  query: z.string().min(2).max(120),
  location: z.string().min(2).max(120),
  maxResults: z.number().int().min(1).max(200).default(20),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { query, location, maxResults } = parsed.data;

  const { data: activeJob } = await supabase
    .from("scrape_jobs")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (activeJob) {
    return NextResponse.json(
      { error: "Já existe uma busca em andamento. Aguarde ou cancele." },
      { status: 409 },
    );
  }

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({
      user_id: user.id,
      query,
      location,
      max_results: maxResults,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create job" },
      { status: 500 },
    );
  }

  await inngest.send({
    name: "maps/scrape.start",
    data: {
      jobId: job.id,
      userId: user.id,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
