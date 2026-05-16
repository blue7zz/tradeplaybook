import type {
  Kline,
  SupportedInstrumentId,
  SupportedKlineBar
} from "@tradeplaybook/shared";
import { mockKlines } from "@tradeplaybook/mock-data";

type OkxRawCandle = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

export const supportedInstIds: SupportedInstrumentId[] = ["BTC-USDT", "ETH-USDT"];
export const supportedBars: SupportedKlineBar[] = ["15m", "1H", "4H"];

export function parseSupportedInstId(value: string | null): SupportedInstrumentId | null {
  if (value === "BTC-USDT" || value === "ETH-USDT") {
    return value;
  }

  return null;
}

export function parseSupportedBar(value: string | null): SupportedKlineBar | null {
  if (value === "15m" || value === "1H" || value === "4H") {
    return value;
  }

  return null;
}

export function normalizeLimit(value: string | null, fallback = 300) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 300);
}

export function okxCandlesToKlines(rawCandles: unknown): Kline[] {
  if (!Array.isArray(rawCandles)) {
    return [];
  }

  return rawCandles
    .filter(isOkxRawCandle)
    .map((raw) => {
      const timestampMs = Number(raw[0]);

      return {
        time: Math.floor(timestampMs / 1000),
        timeISO: new Date(timestampMs).toISOString(),
        open: Number(raw[1]),
        high: Number(raw[2]),
        low: Number(raw[3]),
        close: Number(raw[4]),
        volume: Number(raw[5]),
        confirmed: raw[8] === "1",
        source: "okx" as const
      };
    })
    .filter((kline) =>
      [kline.time, kline.open, kline.high, kline.low, kline.close, kline.volume].every(Number.isFinite)
    )
    .sort((a, b) => a.time - b.time);
}

export function dedupeAndSortKlines(klines: Kline[]) {
  const byTime = new Map<number, Kline>();

  klines.forEach((kline) => {
    byTime.set(kline.time, kline);
  });

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

export function createMockFallbackKlines(instId: SupportedInstrumentId): Kline[] {
  const multiplier = instId === "ETH-USDT" ? 0.047 : 1;

  return mockKlines.map((kline) => ({
    ...kline,
    open: roundPrice(kline.open * multiplier),
    high: roundPrice(kline.high * multiplier),
    low: roundPrice(kline.low * multiplier),
    close: roundPrice(kline.close * multiplier),
    volume: Math.round(kline.volume * (instId === "ETH-USDT" ? 4.2 : 1)),
    source: "mock"
  }));
}

export function barToSeconds(bar: SupportedKlineBar) {
  const seconds: Record<SupportedKlineBar, number> = {
    "15m": 15 * 60,
    "1H": 60 * 60,
    "4H": 4 * 60 * 60
  };

  return seconds[bar];
}

function isOkxRawCandle(value: unknown): value is OkxRawCandle {
  return Array.isArray(value) && value.length >= 9 && value.every((item) => typeof item === "string");
}

function roundPrice(value: number) {
  return Number(value.toFixed(value > 1000 ? 0 : 2));
}
