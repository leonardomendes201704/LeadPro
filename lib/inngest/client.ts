import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "leadpro" });

export type ScrapeStartEvent = {
  name: "maps/scrape.start";
  data: {
    jobId: string;
    userId: string;
  };
};
