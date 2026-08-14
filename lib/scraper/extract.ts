import type { Page } from "playwright-core";
import type { ExtractedBusiness } from "@/lib/types/database";

type ListCard = {
  index: number;
  name: string;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
  maps_url?: string | null;
};

export async function scrollResultsFeed(page: Page, times = 3) {
  const feed = page.locator('div[role="feed"]').first();
  for (let i = 0; i < times; i += 1) {
    await feed.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(1200);
  }
}

export async function collectListCards(page: Page): Promise<ListCard[]> {
  return page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return [];

    const anchors = Array.from(
      feed.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]'),
    );

    const seen = new Set<string>();
    const cards: ListCard[] = [];

    anchors.forEach((anchor, index) => {
      const href = anchor.href;
      if (!href || seen.has(href)) return;
      seen.add(href);

      const container =
        anchor.closest('[jsaction*="mouseover"]') ??
        anchor.closest("div.Nv2PK") ??
        anchor.parentElement;

      const textLines = (container?.textContent ?? anchor.textContent ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const name = textLines[0] ?? anchor.getAttribute("aria-label") ?? "Unknown";
      const ratingMatch = (container?.textContent ?? "").match(
        /(\d+[,.]\d+)\(\s*([\d.,]+)\s*\)/,
      );

      cards.push({
        index,
        name,
        category: textLines[1] ?? null,
        rating: ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : null,
        review_count: ratingMatch
          ? Number(ratingMatch[2].replace(/\./g, "").replace(",", "."))
          : null,
        address: textLines.find((line) => line.includes(",") || /\d/.test(line)) ?? null,
        maps_url: href,
      });
    });

    return cards;
  });
}

export async function extractBusinessDetail(
  page: Page,
  card: ListCard,
): Promise<ExtractedBusiness> {
  const link = page.locator(`a[href="${card.maps_url}"]`).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForTimeout(1500);
  }

  const detail = await page.evaluate(() => {
    const getText = (selector: string) =>
      document.querySelector(selector)?.textContent?.trim() ?? null;

    const heading =
      document.querySelector("h1")?.textContent?.trim() ??
      getText('[data-item-id="title"]');

    const ratingText = document.body.innerText.match(
      /(\d+[,.]\d+)\s*\(([\d.,]+)\)/,
    );

    const phone =
      document.querySelector('button[data-item-id*="phone"]')?.getAttribute("aria-label") ??
      getText('button[aria-label*="Phone"]') ??
      getText('button[aria-label*="Telefone"]');

    const websiteAnchor = document.querySelector<HTMLAnchorElement>(
      'a[data-item-id="authority"]',
    );

    const addressButton = document.querySelector('button[data-item-id="address"]');
    const address =
      addressButton?.getAttribute("aria-label")?.replace(/^Address:\s*/i, "") ??
      addressButton?.textContent?.trim() ??
      null;

    const category = getText('button[jsaction*="category"]');
    const description = getText('[data-section-id="overview"]');

    const hours: Record<string, string> = {};
    document.querySelectorAll("table tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        hours[cells[0].textContent?.trim() ?? ""] = cells[1].textContent?.trim() ?? "";
      }
    });

    const photos = Array.from(
      document.querySelectorAll<HTMLImageElement>("button img"),
    )
      .map((img) => img.src)
      .filter((src) => src.startsWith("http"))
      .slice(0, 5);

    const url = window.location.href;
    const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const placeIdMatch = url.match(/!1s([^!]+)/);

    return {
      name: heading,
      address,
      phone: phone?.replace(/^(Phone|Telefone):\s*/i, "") ?? null,
      website: websiteAnchor?.href ?? null,
      rating: ratingText ? Number(ratingText[1].replace(",", ".")) : null,
      review_count: ratingText
        ? Number(ratingText[2].replace(/\./g, "").replace(",", "."))
        : null,
      latitude: coordsMatch ? Number(coordsMatch[1]) : null,
      longitude: coordsMatch ? Number(coordsMatch[2]) : null,
      maps_url: url,
      place_id: placeIdMatch?.[1] ?? null,
      category,
      hours: Object.keys(hours).length ? hours : null,
      description,
      photos,
      raw_data: {
        pageTitle: document.title,
        bodySnippet: document.body.innerText.slice(0, 4000),
      },
    };
  });

  return {
    name: detail.name ?? card.name,
    address: detail.address ?? card.address,
    phone: detail.phone,
    website: detail.website,
    rating: detail.rating ?? card.rating,
    review_count: detail.review_count ?? card.review_count,
    latitude: detail.latitude,
    longitude: detail.longitude,
    maps_url: detail.maps_url ?? card.maps_url,
    place_id: detail.place_id,
    category: detail.category ?? card.category,
    hours: detail.hours,
    description: detail.description,
    photos: detail.photos,
    raw_data: detail.raw_data,
  };
}

export type { ListCard };
