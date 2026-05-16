import type {
  Candle,
  ChartAnnotation,
  ChartIndicator,
  Kline,
  MarketSnapshot
} from "@tradeplaybook/shared";
import type {
  CandlestickData,
  LineData,
  SeriesMarker,
  Time,
  UTCTimestamp
} from "lightweight-charts";

export interface ChartPriceLine {
  id: string;
  price: number;
  title: string;
  color: string;
}

export interface LightweightChartData {
  candles: Array<CandlestickData<Time>>;
  maLines: Array<{
    id: string;
    label: string;
    data: Array<LineData<Time>>;
  }>;
  markers: Array<SeriesMarker<Time>>;
  priceLines: ChartPriceLine[];
  latestPrice: number;
}

export function toLightweightChartData(market: MarketSnapshot): LightweightChartData {
  const klines = getMarketKlines(market);
  const candles = klines.map((kline) => ({
    time: kline.time as UTCTimestamp,
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close
  }));
  const maLines = (market.indicators ?? []).map((indicator) => ({
    id: indicator.id,
    label: indicator.label,
    data: toIndicatorData(indicator, klines, market.candles)
  }));

  return {
    candles,
    maLines,
    markers: toSeriesMarkers(market.annotations, klines, market.candles),
    priceLines: toPriceLines(market.annotations),
    latestPrice: klines.at(-1)?.close ?? market.price
  };
}

export function getMarketKlines(market: MarketSnapshot): Kline[] {
  if (market.klines && market.klines.length > 0) {
    return market.klines;
  }

  return market.candles.map((candle, index) => candleToKline(candle, index));
}

function candleToKline(candle: Candle, index: number): Kline {
  const baseTime = Date.UTC(2026, 4, 10) / 1000;
  const time = baseTime + index * 24 * 60 * 60;

  return {
    time,
    timeISO: new Date(time * 1000).toISOString(),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    confirmed: true,
    source: "mock"
  };
}

function toIndicatorData(
  indicator: ChartIndicator,
  klines: Kline[],
  candles: Candle[]
): Array<LineData<Time>> {
  return indicator.points.map((point, index) => ({
    time: resolveTime(point.time, klines, candles, index) as UTCTimestamp,
    value: point.value
  }));
}

function toSeriesMarkers(
  annotations: ChartAnnotation[],
  klines: Kline[],
  candles: Candle[]
): Array<SeriesMarker<Time>> {
  return annotations
    .filter((annotation) =>
      [
        "signal",
        "review",
        "note",
        "actualEntry",
        "actualExit",
        "error",
        "backtestBuy",
        "backtestSell",
        "backtestWin",
        "backtestLoss",
        "drawdown"
      ].includes(annotation.type)
    )
    .map((annotation, index) => ({
      time: resolveTime(annotation.time, klines, candles, index) as UTCTimestamp,
      position: markerPosition(annotation),
      color: markerColor(annotation),
      shape: markerShape(annotation),
      text: annotation.label
    }));
}

function toPriceLines(annotations: ChartAnnotation[]): ChartPriceLine[] {
  return annotations
    .filter((annotation) => ["entry", "stop", "target", "invalid"].includes(annotation.type))
    .map((annotation) => ({
      id: annotation.id,
      price: annotation.price,
      title: annotation.label,
      color: priceLineColor(annotation)
    }));
}

function resolveTime(
  rawTime: string,
  klines: Kline[],
  candles: Candle[],
  fallbackIndex: number
): number {
  const directTimestamp = Number(rawTime);

  if (Number.isFinite(directTimestamp) && directTimestamp > 0) {
    return directTimestamp > 10_000_000_000 ? Math.round(directTimestamp / 1000) : directTimestamp;
  }

  const parsed = Date.parse(rawTime);

  if (Number.isFinite(parsed)) {
    return Math.round(parsed / 1000);
  }

  const candleIndex = candles.findIndex((candle) => candle.time === rawTime);

  if (candleIndex >= 0) {
    return klines[candleIndex]?.time ?? klines.at(-1)?.time ?? 0;
  }

  return klines[fallbackIndex % Math.max(klines.length, 1)]?.time ?? klines.at(-1)?.time ?? 0;
}

function markerPosition(annotation: ChartAnnotation): SeriesMarker<Time>["position"] {
  if (["backtestBuy", "actualEntry"].includes(annotation.type)) {
    return "belowBar";
  }

  if (["backtestSell", "actualExit", "backtestLoss", "error"].includes(annotation.type)) {
    return "aboveBar";
  }

  return "inBar";
}

function markerShape(annotation: ChartAnnotation): SeriesMarker<Time>["shape"] {
  if (["backtestBuy", "actualEntry"].includes(annotation.type)) {
    return "arrowUp";
  }

  if (["backtestSell", "actualExit"].includes(annotation.type)) {
    return "arrowDown";
  }

  if (["error", "backtestLoss"].includes(annotation.type)) {
    return "square";
  }

  return "circle";
}

function markerColor(annotation: ChartAnnotation) {
  const colors: Partial<Record<ChartAnnotation["type"], string>> = {
    actualEntry: "#27805f",
    actualExit: "#3861a6",
    backtestBuy: "#27805f",
    backtestSell: "#3861a6",
    backtestWin: "#27805f",
    backtestLoss: "#c7473f",
    drawdown: "#b7791f",
    error: "#c7473f",
    review: "#3861a6",
    note: "#667085"
  };

  return colors[annotation.type] ?? "#667085";
}

function priceLineColor(annotation: ChartAnnotation) {
  const colors: Partial<Record<ChartAnnotation["type"], string>> = {
    entry: "#27805f",
    stop: "#c7473f",
    target: "#3861a6",
    invalid: "#b7791f"
  };

  return colors[annotation.type] ?? "#667085";
}
