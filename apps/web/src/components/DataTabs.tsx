"use client";

import type { WorkbenchData } from "@tradeplaybook/shared";
import { AiSuggestionsTab } from "./tabs/AiSuggestionsTab";
import { BacktestTab } from "./tabs/BacktestTab";
import { CurrentPlanTab } from "./tabs/CurrentPlanTab";
import { PersonalStatusTab } from "./tabs/PersonalStatusTab";
import { ReviewTasksTab } from "./tabs/ReviewTasksTab";
import { RulesTab } from "./tabs/RulesTab";
import { TradeHistoryTab } from "./tabs/TradeHistoryTab";
import { TradingSystemTab } from "./tabs/TradingSystemTab";
import { useEffect, useState } from "react";

type TabKey =
  | "personal"
  | "plan"
  | "history"
  | "backtest"
  | "review"
  | "system"
  | "rules"
  | "ai";

interface DataTabsProps {
  data: WorkbenchData;
  onAbandonPlan: () => void;
  onAcceptRuleSuggestion: (suggestionId: string) => void;
  onConfirmPlan: () => void;
  onGenerateReview: (recordId: string) => void;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "personal", label: "个人状态" },
  { key: "plan", label: "当前计划" },
  { key: "history", label: "交易历史" },
  { key: "backtest", label: "回测数据" },
  { key: "review", label: "复盘任务" },
  { key: "system", label: "交易体系" },
  { key: "rules", label: "规则库" },
  { key: "ai", label: "AI 建议" }
];

export function DataTabs({
  data,
  onAbandonPlan,
  onAcceptRuleSuggestion,
  onConfirmPlan,
  onGenerateReview
}: DataTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");

  useEffect(() => {
    if (data.review.id.includes("backtest") && data.backtestResult.strategyName.includes("MA30")) {
      setActiveTab("backtest");
      return;
    }

    if (data.review.recordId) {
      setActiveTab("review");
      return;
    }

    if (data.currentPlan?.id && data.review.planId === data.currentPlan.id) {
      setActiveTab("plan");
    }
  }, [
    data.backtestResult.strategyName,
    data.currentPlan?.id,
    data.review.id,
    data.review.planId,
    data.review.recordId
  ]);

  return (
    <section className="min-h-[300px] rounded-lg border border-line bg-panel shadow-panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase text-muted">数据面板</p>
          <h2 className="mt-1 text-xl font-bold text-ink">交易上下文</h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-[#fbfaf7] text-muted hover:border-ink hover:text-ink"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {activeTab === "personal" && (
          <PersonalStatusTab
            periodReports={data.periodReports}
            profile={data.profile}
            review={data.review}
            tradingSystem={data.tradingSystem}
          />
        )}
        {activeTab === "plan" && (
          <CurrentPlanTab
            onAbandonPlan={onAbandonPlan}
            onConfirmPlan={onConfirmPlan}
            plan={data.currentPlan}
            review={data.review}
          />
        )}
        {activeTab === "history" && <TradeHistoryTab records={data.tradeRecords} />}
        {activeTab === "backtest" && <BacktestTab result={data.backtestResult} />}
        {activeTab === "review" && (
          <ReviewTasksTab
            records={data.tradeRecords}
            report={data.review}
            reports={data.reviewReports}
            onGenerateReview={onGenerateReview}
          />
        )}
        {activeTab === "system" && (
          <TradingSystemTab
            signalDefinitions={data.signalDefinitions}
            tradingSystem={data.tradingSystem}
          />
        )}
        {activeTab === "rules" && (
          <RulesTab
            ruleSuggestions={data.ruleSuggestions}
            tradingSystem={data.tradingSystem}
            onAcceptRuleSuggestion={onAcceptRuleSuggestion}
          />
        )}
        {activeTab === "ai" && <AiSuggestionsTab suggestions={data.aiSuggestions} />}
      </div>
    </section>
  );
}
