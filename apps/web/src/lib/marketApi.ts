import type {
  AiChatRequest,
  AiChatResponse,
  BacktestResult,
  MarketCandlesResponse,
  MarketHistoryCandlesResponse,
  SupportedInstrumentId,
  SupportedKlineBar
} from "@tradeplaybook/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function fetchMarketCandles(
  instId: SupportedInstrumentId,
  bar: SupportedKlineBar,
  limit = 300
): Promise<MarketCandlesResponse> {
  const url = new URL("/api/market/candles", API_BASE_URL);
  url.searchParams.set("instId", instId);
  url.searchParams.set("bar", bar);
  url.searchParams.set("limit", String(limit));

  return fetchJson<MarketCandlesResponse>(url);
}

export async function fetchHistoryCandles(
  instId: SupportedInstrumentId,
  bar: SupportedKlineBar,
  days = 90
): Promise<MarketHistoryCandlesResponse> {
  const url = new URL("/api/market/history-candles", API_BASE_URL);
  url.searchParams.set("instId", instId);
  url.searchParams.set("bar", bar);
  url.searchParams.set("days", String(days));

  return fetchJson<MarketHistoryCandlesResponse>(url);
}

export async function fetchMa30Backtest(
  instId: SupportedInstrumentId,
  bar: SupportedKlineBar,
  days = 90
): Promise<{ result: BacktestResult; source: "okx" | "mock"; fallback: boolean; error?: string }> {
  const url = new URL("/api/backtest/ma30", API_BASE_URL);
  url.searchParams.set("instId", instId);
  url.searchParams.set("bar", bar);
  url.searchParams.set("days", String(days));

  return fetchJson(url);
}

export async function postAiChat(payload: AiChatRequest): Promise<AiChatResponse> {
  const url = new URL("/api/ai/chat", API_BASE_URL);

  return fetchJson<AiChatResponse>(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function fetchJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
