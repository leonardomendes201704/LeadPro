import type { Browser } from "playwright-core";
import type { CursorState, ExtractedBusiness } from "@/lib/types/database";
import {
  acceptCookiesIfPresent,
  buildMapsSearchUrl,
  launchMapsBrowser,
  waitForResultsFeed,
} from "@/lib/scraper/maps-browser";
import {
  collectListCards,
  extractBusinessDetail,
  scrollResultsFeed,
  type ListCard,
} from "@/lib/scraper/extract";

const BATCH_SIZE = 3;

export type ScrapeBatchResult = {
  businesses: ExtractedBusiness[];
  cursorState: CursorState;
  done: boolean;
};

export async function scrapeMapsBatch(options: {
  query: string;
  location: string;
  maxResults: number;
  currentCount: number;
  cursorState: CursorState;
}): Promise<ScrapeBatchResult> {
  const { query, location, maxResults, currentCount, cursorState } = options;
  let browser: Browser | null = null;

  try {
    browser = await launchMapsBrowser();
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
    });

    const searchUrl =
      cursorState.searchUrl ?? buildMapsSearchUrl(query, location);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await acceptCookiesIfPresent(page);
    await waitForResultsFeed(page);

    const scrollAttempts = (cursorState.scrollAttempts ?? 0) + 1;
    if (scrollAttempts > 1) {
      await scrollResultsFeed(page, scrollAttempts);
    }

    const cards = await collectListCards(page);
    const processed = new Set(cursorState.processedIndexes ?? []);
    const pendingCards = cards.filter((card) => !processed.has(card.index));

    const remaining = maxResults - currentCount;
    const slice = pendingCards.slice(0, Math.min(BATCH_SIZE, remaining));
    const businesses: ExtractedBusiness[] = [];

    for (const card of slice) {
      try {
        const business = await extractBusinessDetail(page, card);
        businesses.push(business);
        processed.add(card.index);
      } catch {
        businesses.push({
          name: card.name,
          address: card.address,
          rating: card.rating,
          review_count: card.review_count,
          category: card.category,
          maps_url: card.maps_url,
          raw_data: { fallback: true, card },
        });
        processed.add(card.index);
      }
    }

    const newCount = currentCount + businesses.length;
    const hasMore =
      newCount < maxResults &&
      pendingCards.length > slice.length &&
      cards.length > processed.size;

    return {
      businesses,
      cursorState: {
        searchUrl: page.url(),
        processedIndexes: Array.from(processed),
        scrollAttempts,
        hasMore,
      },
      done: newCount >= maxResults || !hasMore || businesses.length === 0,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
