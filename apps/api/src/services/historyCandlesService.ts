import type { Kline, SupportedInstrumentId, SupportedKlineBar } from "@tradeplaybook/shared";
import { fetchOkxHistoryCandles } from "./okxMarketClient.js";
import { barToSeconds, dedupeAndSortKlines } from "./klineAdapter.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 120;

export async function fetchConfirmedHistoryKlines(
  instId: SupportedInstrumentId,
  bar: SupportedKlineBar,
  days: number
) {
  const sinceSeconds = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const allKlines: Kline[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const pageKlines = await fetchOkxHistoryCandles({
      instId,
      bar,
      limit: PAGE_LIMIT,
      after
    });

    if (pageKlines.length === 0) {
      break;
    }

    allKlines.push(...pageKlines);

    const oldest = pageKlines[0];
    after = String(oldest.time * 1000);

    if (oldest.time <= sinceSeconds) {
      break;
    }
  }

  const barSeconds = barToSeconds(bar);

  return dedupeAndSortKlines(allKlines).filter(
    (kline) => kline.confirmed && kline.time >= sinceSeconds - barSeconds
  );
}
