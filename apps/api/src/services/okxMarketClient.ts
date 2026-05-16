import type { SupportedInstrumentId, SupportedKlineBar } from "@tradeplaybook/shared";
import { okxCandlesToKlines } from "./klineAdapter.js";

interface OkxResponse {
  code: string;
  msg: string;
  data: unknown;
}

export interface OkxCandlesParams {
  instId: SupportedInstrumentId;
  bar: SupportedKlineBar;
  limit: number;
  after?: string;
  before?: string;
}

const OKX_BASE_URL = process.env.OKX_BASE_URL ?? "https://www.okx.com";

export async function fetchOkxCandles(params: OkxCandlesParams) {
  return fetchOkxKlines("/api/v5/market/candles", params);
}

export async function fetchOkxHistoryCandles(params: OkxCandlesParams) {
  return fetchOkxKlines("/api/v5/market/history-candles", params);
}

async function fetchOkxKlines(pathname: string, params: OkxCandlesParams) {
  const url = new URL(pathname, OKX_BASE_URL);
  url.searchParams.set("instId", params.instId);
  url.searchParams.set("bar", params.bar);
  url.searchParams.set("limit", String(params.limit));

  if (params.after) {
    url.searchParams.set("after", params.after);
  }

  if (params.before) {
    url.searchParams.set("before", params.before);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`OKX request failed with ${response.status}`);
  }

  const payload = (await response.json()) as OkxResponse;

  if (payload.code !== "0") {
    throw new Error(payload.msg || `OKX returned code ${payload.code}`);
  }

  return okxCandlesToKlines(payload.data);
}
