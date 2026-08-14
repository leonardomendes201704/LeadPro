import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { scrapeMapsBatch } from "@/lib/scraper/run-batch";
import type { CursorState, ScrapeJob } from "@/lib/types/database";

async function getJob(jobId: string): Promise<ScrapeJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ScrapeJob | null;
}

async function persistBatch(
  job: ScrapeJob,
  businesses: Awaited<ReturnType<typeof scrapeMapsBatch>>["businesses"],
  cursorState: CursorState,
  done: boolean,
) {
  const supabase = createAdminClient();

  if (businesses.length > 0) {
    const rows = businesses.map((business) => ({
      user_id: job.user_id,
      job_id: job.id,
      place_id: business.place_id ?? null,
      name: business.name,
      address: business.address ?? null,
      phone: business.phone ?? null,
      website: business.website ?? null,
      email: business.email ?? null,
      rating: business.rating ?? null,
      review_count: business.review_count ?? null,
      latitude: business.latitude ?? null,
      longitude: business.longitude ?? null,
      maps_url: business.maps_url ?? null,
      category: business.category ?? null,
      hours: business.hours ?? null,
      price_level: business.price_level ?? null,
      description: business.description ?? null,
      photos: business.photos ?? null,
      raw_data: business.raw_data ?? {},
    }));

    const { error: leadsError } = await supabase.from("leads").upsert(rows, {
      onConflict: "job_id,name,address",
      ignoreDuplicates: false,
    });

    if (leadsError) throw new Error(leadsError.message);
  }

  const resultsCount = job.results_count + businesses.length;
  const progress = Math.min(
    100,
    Math.round((resultsCount / job.max_results) * 100),
  );

  const { error: jobError } = await supabase
    .from("scrape_jobs")
    .update({
      status: done ? "completed" : "running",
      results_count: resultsCount,
      progress: done ? 100 : progress,
      cursor_state: cursorState,
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (jobError) throw new Error(jobError.message);

  return { resultsCount, done };
}

export const scrapeMapsFunction = inngest.createFunction(
  {
    id: "scrape-maps",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.userId" },
    triggers: [{ event: "maps/scrape.start" }],
  },
  async ({ event, step }) => {
    const { jobId } = event.data;

    await step.run("mark-running", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("scrape_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", jobId);
    });

    let keepRunning = true;

    while (keepRunning) {
      const batchResult = await step.run("scrape-batch", async () => {
        const job = await getJob(jobId);
        if (!job) throw new Error("Job not found");
        if (job.status === "cancelled") {
          return { cancelled: true as const };
        }

        return scrapeMapsBatch({
          query: job.query,
          location: job.location,
          maxResults: job.max_results,
          currentCount: job.results_count,
          cursorState: (job.cursor_state ?? {}) as CursorState,
        });
      });

      if ("cancelled" in batchResult && batchResult.cancelled) {
        keepRunning = false;
        break;
      }

      const persistResult = await step.run("persist-batch", async () => {
        const job = await getJob(jobId);
        if (!job) throw new Error("Job not found");

        const result = batchResult as Awaited<ReturnType<typeof scrapeMapsBatch>>;
        return persistBatch(
          job,
          result.businesses,
          result.cursorState,
          result.done,
        );
      });

      keepRunning = !persistResult.done;
    }

    return { jobId, status: "finished" };
  },
);
