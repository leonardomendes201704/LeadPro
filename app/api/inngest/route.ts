import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeMapsFunction } from "@/lib/inngest/functions/scrape-maps";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scrapeMapsFunction],
});
