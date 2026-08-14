import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser, type Page } from "playwright-core";

const isServerless =
  process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

export async function launchMapsBrowser(): Promise<Browser> {
  if (isServerless) {
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({
    headless: true,
    channel: "chrome",
  });
}

export function buildMapsSearchUrl(query: string, location: string) {
  const term = encodeURIComponent(`${query} ${location}`.trim());
  return `https://www.google.com/maps/search/${term}`;
}

export async function acceptCookiesIfPresent(page: Page) {
  const selectors = [
    'button:has-text("Accept all")',
    'button:has-text("Aceitar tudo")',
    'button:has-text("Rejeitar tudo")',
    'button:has-text("Reject all")',
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click().catch(() => undefined);
      await page.waitForTimeout(500);
      break;
    }
  }
}

export async function waitForResultsFeed(page: Page) {
  await page.waitForSelector('div[role="feed"]', { timeout: 30000 });
}
