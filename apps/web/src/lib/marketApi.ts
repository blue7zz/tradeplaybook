import type {
  AiChatRequest,
  AiChatResponse,
  BacktestResult,
  MarketCandlesResponse,
  MarketHistoryCandlesResponse,
  OnboardingChatRequest,
  OnboardingChatResponse,
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

export async function postOnboardingChat(
  payload: OnboardingChatRequest
): Promise<OnboardingChatResponse> {
  const url = new URL("/api/ai/onboarding-chat", API_BASE_URL);

  return fetchJson<OnboardingChatResponse>(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function streamOnboardingChat(
  payload: OnboardingChatRequest,
  handlers: {
    onProgress: (data: { step: string; message: string }) => void;
    onFinal: (data: OnboardingChatResponse) => void;
    onError: (data: { message: string; error?: string }) => void;
  }
) {
  const url = new URL("/api/ai/onboarding-chat-stream", API_BASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    throw new Error(`API stream request failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventChunk of events) {
      const event = parseSseEvent(eventChunk);

      if (!event) {
        continue;
      }

      if (event.event === "progress") {
        handlers.onProgress(event.data as { step: string; message: string });
      } else if (event.event === "final") {
        handlers.onFinal(event.data as OnboardingChatResponse);
      } else if (event.event === "error") {
        handlers.onError(event.data as { message: string; error?: string });
      }
    }
  }
}

function parseSseEvent(chunk: string) {
  const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
  const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) {
    return null;
  }

  return {
    event: eventLine.slice("event: ".length),
    data: JSON.parse(dataLine.slice("data: ".length)) as unknown
  };
}

async function fetchJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
