import type {
  MarketInstrument,
  SupportedInstrumentId,
  SupportedKlineBar
} from "@tradeplaybook/shared";
import { okxCandlesToKlines } from "./klineAdapter.js";

interface OkxResponse {
  code: string;
  msg: string;
  data: unknown;
}

interface OkxInstrumentRaw {
  instId?: string;
  instType?: string;
  baseCcy?: string;
  quoteCcy?: string;
  state?: string;
  minSz?: string;
  lotSz?: string;
  tickSz?: string;
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

export async function fetchOkxSpotInstrument(instId: string): Promise<MarketInstrument | null> {
  const normalizedInstId = normalizeOkxInstrumentId(instId);

  if (!normalizedInstId) {
    return null;
  }

  const url = new URL("/api/v5/public/instruments", OKX_BASE_URL);
  url.searchParams.set("instType", "SPOT");
  url.searchParams.set("instId", normalizedInstId);

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`OKX instruments request failed with ${response.status}`);
  }

  const payload = (await response.json()) as OkxResponse;

  if (payload.code !== "0") {
    throw new Error(payload.msg || `OKX returned code ${payload.code}`);
  }

  if (!Array.isArray(payload.data)) {
    return null;
  }

  const instrument = (payload.data as OkxInstrumentRaw[]).find(
    (item) => item.instId === normalizedInstId
  );

  return instrument ? okxInstrumentToMarketInstrument(instrument) : null;
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

function normalizeOkxInstrumentId(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");

  if (!compact) {
    return null;
  }

  if (/^[A-Z0-9]+[-/][A-Z0-9]+$/.test(compact)) {
    return compact.replace("/", "-");
  }

  if (/^[A-Z0-9]{2,12}$/.test(compact)) {
    return `${compact}-USDT`;
  }

  return null;
}

function okxInstrumentToMarketInstrument(instrument: OkxInstrumentRaw): MarketInstrument {
  const instId = instrument.instId ?? "";

  return {
    instId,
    displayName: instId.replace("-", "/"),
    baseCurrency: instrument.baseCcy,
    quoteCurrency: instrument.quoteCcy,
    instrumentType: instrument.instType,
    state: instrument.state,
    minSize: instrument.minSz,
    lotSize: instrument.lotSz,
    tickSize: instrument.tickSz
  };
}
