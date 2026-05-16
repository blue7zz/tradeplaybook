import type {
  BacktestResult,
  ChartAnnotation,
  ChartIndicator,
  Kline,
  SupportedInstrumentId,
  SupportedKlineBar
} from "@tradeplaybook/shared";

interface ClosedTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  returnPercent: number;
}

export function runMa30Backtest(
  klines: Kline[],
  instId: SupportedInstrumentId,
  bar: SupportedKlineBar,
  days: number
): BacktestResult {
  const confirmed = klines.filter((kline) => kline.confirmed).sort((a, b) => a.time - b.time);
  const ma30 = calculateMovingAverage(confirmed, 30);
  const trades = buildCrossTrades(confirmed, ma30);
  const totalReturnPercent = trades.reduce((sum, trade) => sum + trade.returnPercent, 0);
  const wins = trades.filter((trade) => trade.returnPercent > 0);
  const losses = trades.filter((trade) => trade.returnPercent <= 0);
  const maxDrawdownPercent = calculateMaxDrawdownPercent(trades);

  const result: BacktestResult = {
    id: `backtest_ma30_real_${Date.now()}`,
    strategyName: "MA30 均线趋势跟随策略",
    tradingSystemId: "runtime",
    symbol: instId,
    timeframe: bar,
    period: {
      from: confirmed[0]?.timeISO.slice(0, 10) ?? "",
      to: confirmed.at(-1)?.timeISO.slice(0, 10) ?? ""
    },
    sampleSize: confirmed.length,
    tradeCount: trades.length,
    winRatePercent: trades.length === 0 ? 0 : round((wins.length / trades.length) * 100, 2),
    totalReturnPercent: round(totalReturnPercent, 2),
    averageRiskRewardRatio: 0,
    maxDrawdownR: 0,
    maxDrawdownPercent,
    maxConsecutiveLosses: calculateMaxConsecutiveLosses(trades),
    averageWinPercent: wins.length === 0 ? 0 : round(average(wins.map((trade) => trade.returnPercent)), 2),
    averageLossPercent: losses.length === 0 ? 0 : round(average(losses.map((trade) => trade.returnPercent)), 2),
    totalReturnR: round(totalReturnPercent / 2, 2),
    aiSummary:
      "真实 OKX 历史 K 线基础回测已完成。结果仅用于辅助决策，不是投资建议，也不代表未来收益。",
    annotations: createTradeAnnotations(trades, instId),
    indicators: [createMa30Indicator(ma30)],
    summary: `最近 ${days} 天 MA30 基础回测完成，共 ${trades.length} 笔交易，总收益 ${round(totalReturnPercent, 2)}%。`,
    limitations: [
      "基础回测未计入手续费、滑点和真实成交限制。",
      "结果只用于辅助决策，不是投资建议，不代表未来收益。",
      "系统不会自动下单，也不会执行真钱交易。"
    ]
  };

  return result;
}

function calculateMovingAverage(klines: Kline[], period: number) {
  return klines
    .map((kline, index) => {
      if (index < period - 1) {
        return null;
      }

      const window = klines.slice(index - period + 1, index + 1);
      const value = average(window.map((item) => item.close));

      return {
        time: kline.timeISO,
        value: round(value, 4)
      };
    })
    .filter((point): point is { time: string; value: number } => point !== null);
}

function buildCrossTrades(klines: Kline[], ma30: Array<{ time: string; value: number }>) {
  const maByTime = new Map(ma30.map((point) => [point.time, point.value]));
  const trades: ClosedTrade[] = [];
  let openTrade: { entryTime: number; entryPrice: number } | null = null;

  for (let index = 1; index < klines.length; index += 1) {
    const prev = klines[index - 1];
    const current = klines[index];
    const prevMa = maByTime.get(prev.timeISO);
    const currentMa = maByTime.get(current.timeISO);

    if (prevMa === undefined || currentMa === undefined) {
      continue;
    }

    const crossedUp = prev.close <= prevMa && current.close > currentMa;
    const crossedDown = prev.close >= prevMa && current.close < currentMa;

    if (!openTrade && crossedUp) {
      openTrade = {
        entryTime: current.time,
        entryPrice: current.close
      };
      continue;
    }

    if (openTrade && crossedDown) {
      trades.push(closeTrade(openTrade, current.time, current.close));
      openTrade = null;
    }
  }

  const last = klines.at(-1);

  if (openTrade && last) {
    trades.push(closeTrade(openTrade, last.time, last.close));
  }

  return trades;
}

function closeTrade(openTrade: { entryTime: number; entryPrice: number }, exitTime: number, exitPrice: number) {
  return {
    entryTime: openTrade.entryTime,
    entryPrice: openTrade.entryPrice,
    exitTime,
    exitPrice,
    returnPercent: round(((exitPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100, 2)
  };
}

function createTradeAnnotations(trades: ClosedTrade[], symbol: string): ChartAnnotation[] {
  return trades.flatMap((trade, index) => {
    const resultType = trade.returnPercent >= 0 ? "backtestWin" : "backtestLoss";

    return [
      {
        id: `ma30_buy_${index}`,
        symbol,
        time: String(trade.entryTime),
        price: trade.entryPrice,
        label: "买点",
        type: "backtestBuy" as const
      },
      {
        id: `ma30_sell_${index}`,
        symbol,
        time: String(trade.exitTime),
        price: trade.exitPrice,
        label: "卖点",
        type: "backtestSell" as const
      },
      {
        id: `ma30_result_${index}`,
        symbol,
        time: String(trade.exitTime),
        price: trade.exitPrice,
        label: trade.returnPercent >= 0 ? `盈利 ${trade.returnPercent}%` : `亏损 ${trade.returnPercent}%`,
        type: resultType
      }
    ];
  });
}

function createMa30Indicator(points: Array<{ time: string; value: number }>): ChartIndicator {
  return {
    id: "indicator_ma30_real",
    label: "MA30",
    type: "movingAverage",
    period: 30,
    points
  };
}

function calculateMaxDrawdownPercent(trades: ClosedTrade[]) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  trades.forEach((trade) => {
    equity += trade.returnPercent;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  return round(maxDrawdown, 2);
}

function calculateMaxConsecutiveLosses(trades: ClosedTrade[]) {
  let current = 0;
  let max = 0;

  trades.forEach((trade) => {
    if (trade.returnPercent <= 0) {
      current += 1;
      max = Math.max(max, current);
      return;
    }

    current = 0;
  });

  return max;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}
