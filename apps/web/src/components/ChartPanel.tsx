"use client";

import type { MarketSnapshot } from "@tradeplaybook/shared";
import { ColorType, LineStyle, createChart } from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import { toLightweightChartData } from "../lib/chartAdapters";

interface ChartPanelProps {
  market: MarketSnapshot;
}

export function ChartPanel({ market }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartData = useMemo(() => toLightweightChartData(market), [market]);
  const hasMa30 = chartData.maLines.some((line) => line.label.toLowerCase().includes("ma30"));

  useEffect(() => {
    const container = containerRef.current;

    if (!container || chartData.candles.length === 0) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#fbfaf5" },
        textColor: "#667085"
      },
      grid: {
        vertLines: { color: "rgba(23,26,31,0.07)" },
        horzLines: { color: "rgba(23,26,31,0.07)" }
      },
      rightPriceScale: {
        borderColor: "#e3e2d7"
      },
      timeScale: {
        borderColor: "#e3e2d7",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        mode: 0
      }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#27805f",
      downColor: "#c7473f",
      borderUpColor: "#27805f",
      borderDownColor: "#c7473f",
      wickUpColor: "#27805f",
      wickDownColor: "#c7473f",
      priceLineVisible: false
    });

    candleSeries.setData(chartData.candles);
    candleSeries.setMarkers(chartData.markers);

    chartData.priceLines.forEach((line) => {
      candleSeries.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: line.title
      });
    });

    chartData.maLines.forEach((line) => {
      const series = chart.addLineSeries({
        color: "#b7791f",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false
      });
      series.setData(line.data);
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartData]);

  return (
    <section
      aria-label="K线图表区域"
      className="flex h-full min-h-0 flex-col rounded-lg border border-line bg-panel p-5 shadow-panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-muted">{market.displayName}</p>
          <div className="mt-2 flex items-end gap-3">
            <h2 className="text-4xl font-bold leading-none text-ink">
              {chartData.latestPrice.toLocaleString("en-US")}
            </h2>
            <span className={`text-lg font-bold ${market.changePercent >= 0 ? "text-success" : "text-danger"}`}>
              {market.changePercent >= 0 ? "+" : ""}
              {market.changePercent}%
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-[#fbfaf7] px-3 py-2 text-right">
          <p className="text-xs text-muted">图表状态</p>
          <strong className="text-sm text-success">
            {hasMa30 ? "真实图表 · MA30" : "真实图表 · K 线"}
          </strong>
        </div>
      </div>

      <div className="relative mt-5 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#e3e2d7] bg-[#fbfaf5]">
        <div ref={containerRef} className="absolute inset-0" />
        {market.annotations.length === 0 ? (
          <div className="absolute bottom-4 left-5 rounded-md bg-white/85 px-2.5 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
            红灯状态：未生成入场、止损、止盈标注
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-4 left-5 flex max-w-[76%] flex-wrap gap-2">
            {market.annotations.slice(0, 8).map((annotation) => (
              <span
                className="rounded-md bg-white/85 px-2.5 py-1.5 text-xs font-bold text-ink ring-1 ring-line"
                key={annotation.id}
              >
                {annotation.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        行情和 AI 输出仅用于辅助决策，不是投资建议；不包含自动下单或真钱执行。
      </p>
    </section>
  );
}
