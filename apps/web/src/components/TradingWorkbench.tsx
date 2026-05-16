"use client";

import type { WorkbenchData } from "@tradeplaybook/shared";
import { useEffect, useState } from "react";
import { handleAiChatWithActions } from "../lib/aiActionReducer";
import { fetchMarketCandles } from "../lib/marketApi";
import {
  abandonCurrentPlan,
  acceptRuleSuggestion,
  confirmCurrentPlan,
  generateReviewForRecord,
  handleWorkbenchIdea
} from "../lib/workbenchEngine";
import { AiChatPanel } from "./AiChatPanel";
import { ChartPanel } from "./ChartPanel";
import { DataTabs } from "./DataTabs";

interface TradingWorkbenchProps {
  data: WorkbenchData;
  onDataChange?: (data: WorkbenchData) => void;
  onReturnToOnboarding?: () => void;
}

export function TradingWorkbench({
  data,
  onDataChange,
  onReturnToOnboarding
}: TradingWorkbenchProps) {
  const [workbenchData, setWorkbenchData] = useState<WorkbenchData>(data);
  const [isAiBusy, setIsAiBusy] = useState(false);

  useEffect(() => {
    setWorkbenchData(data);
  }, [data]);

  useEffect(() => {
    onDataChange?.(workbenchData);
  }, [onDataChange, workbenchData]);

  useEffect(() => {
    let cancelled = false;
    const instId = normalizeInstId(workbenchData.tradingSystem.marketScope);
    const bar = normalizeBar(workbenchData.tradingSystem.timeframes[0]);

    fetchMarketCandles(instId, bar, 300)
      .then((response) => {
        if (cancelled || response.klines.length === 0) {
          return;
        }

        setWorkbenchData((current) => {
          const latest = response.klines.at(-1);
          const previous = response.klines.at(-2);
          const changePercent =
            latest && previous
              ? Number((((latest.close - previous.close) / previous.close) * 100).toFixed(2))
              : current.market.changePercent;

          return {
            ...current,
            market: {
              ...current.market,
              symbol: response.instId,
              displayName: response.instId,
              price: latest?.close ?? current.market.price,
              changePercent,
              trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "range",
              klines: response.klines,
              updatedAt: response.generatedAt
            }
          };
        });
      })
      .catch(() => {
        // API 不可用时保留 mock fallback，避免工作台白屏。
      });

    return () => {
      cancelled = true;
    };
  }, [workbenchData.tradingSystem.marketScope, workbenchData.tradingSystem.timeframes]);

  async function handleSubmitIdea(idea: string) {
    if (isLocalOnlyCommand(idea)) {
      setWorkbenchData((current) => handleWorkbenchIdea(current, idea));
      return;
    }

    setIsAiBusy(true);

    try {
      const nextData = await handleAiChatWithActions(workbenchData, idea);
      setWorkbenchData(nextData);
    } catch {
      setWorkbenchData((current) => handleWorkbenchIdea(current, idea));
    } finally {
      setIsAiBusy(false);
    }
  }

  function handleConfirmPlan() {
    setWorkbenchData((current) => confirmCurrentPlan(current));
  }

  function handleAbandonPlan() {
    setWorkbenchData((current) => abandonCurrentPlan(current));
  }

  function handleGenerateReview(recordId: string) {
    setWorkbenchData((current) => generateReviewForRecord(current, recordId));
  }

  function handleAcceptRuleSuggestion(suggestionId: string) {
    setWorkbenchData((current) => acceptRuleSuggestion(current, suggestionId));
  }

  const lightLabel = getLightLabel(workbenchData.review.light);
  const statusLabel = getStatusLabel(workbenchData);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-5 py-4">
      <header className="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-line bg-panel px-5 py-4 shadow-panel">
        <div>
          <p className="text-xs font-bold uppercase text-muted">TradePlaybook AI</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-ink">AI 交易工作台</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md border border-line bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-muted transition hover:border-ink hover:text-ink"
            onClick={onReturnToOnboarding}
            type="button"
          >
            返回引导页
          </button>
          <div className="grid min-w-64 gap-1 rounded-lg border border-line bg-[#fbfaf7] px-4 py-3 text-right">
            <span className="text-xs font-bold uppercase text-muted">{lightLabel}</span>
            <strong className={`text-base font-bold ${getLightClass(workbenchData.review.light)}`}>
              {statusLabel}
            </strong>
          </div>
        </div>
      </header>

      <section className="grid h-[560px] min-h-0 grid-cols-[minmax(0,1fr)_420px] gap-4">
        <div className="min-h-0">
          <ChartPanel market={workbenchData.market} />
        </div>
        <AiChatPanel
          isBusy={isAiBusy}
          messages={workbenchData.messages}
          onSubmitIdea={handleSubmitIdea}
          review={workbenchData.review}
        />
      </section>

      <DataTabs
        data={workbenchData}
        onAbandonPlan={handleAbandonPlan}
        onAcceptRuleSuggestion={handleAcceptRuleSuggestion}
        onConfirmPlan={handleConfirmPlan}
        onGenerateReview={handleGenerateReview}
      />
    </main>
  );
}

function isLocalOnlyCommand(idea: string) {
  return (
    idea.includes("记录这笔") ||
    idea.includes("生成交易记录") ||
    idea.includes("已执行") ||
    idea.includes("复盘") ||
    idea.toLowerCase().includes("review") ||
    idea.includes("接受规则") ||
    idea.includes("写入规则库") ||
    idea.includes("采纳建议")
  );
}

function normalizeInstId(value: string): "BTC-USDT" | "ETH-USDT" {
  return value.toUpperCase().includes("ETH") ? "ETH-USDT" : "BTC-USDT";
}

function normalizeBar(value: string | undefined): "15m" | "1H" | "4H" {
  if (value === "15m" || value === "1H" || value === "4H") {
    return value;
  }

  return "4H";
}

function getStatusLabel(data: WorkbenchData) {
  if (data.review.light === "red") {
    return "禁止生成执行计划";
  }

  if (data.review.light === "yellow") {
    return "需要补充确认";
  }

  return data.review.canGenerateExecutionPlan ? "可生成计划草案" : "只观察不执行";
}

function getLightLabel(light: WorkbenchData["review"]["light"]) {
  const labels = {
    green: "绿灯",
    yellow: "黄灯",
    red: "红灯"
  };

  return labels[light];
}

function getLightClass(light: WorkbenchData["review"]["light"]) {
  const classes = {
    green: "text-success",
    yellow: "text-warning",
    red: "text-danger"
  };

  return classes[light];
}
