"use client";

import type { UserTradingSystem, WorkbenchData } from "@tradeplaybook/shared";
import { useCallback, useEffect, useState } from "react";
import {
  clearStoredWorkbenchData,
  loadStoredWorkbenchData,
  saveStoredWorkbenchData
} from "../lib/workbenchStorage";
import { OnboardingWizard } from "./OnboardingWizard";
import { TradingWorkbench } from "./TradingWorkbench";

interface TradePlaybookAppProps {
  initialData: WorkbenchData;
}

export function TradePlaybookApp({ initialData }: TradePlaybookAppProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [workbenchData, setWorkbenchData] = useState<WorkbenchData | null>(null);

  useEffect(() => {
    try {
      setWorkbenchData(loadStoredWorkbenchData(initialData));
    } finally {
      setIsHydrated(true);
    }
  }, [initialData]);

  const handleCompleteOnboarding = useCallback(
    (tradingSystem: UserTradingSystem) => {
      const nextData = createWorkbenchDataForTradingSystem(initialData, tradingSystem);
      setWorkbenchData(nextData);
      saveStoredWorkbenchData(nextData);
    },
    [initialData]
  );

  const handleDataChange = useCallback((nextData: WorkbenchData) => {
    setWorkbenchData(nextData);
    saveStoredWorkbenchData(nextData);
  }, []);

  const handleReturnToOnboarding = useCallback(() => {
    clearStoredWorkbenchData();
    setWorkbenchData(null);
  }, []);

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm font-bold text-muted">
        正在加载 TradePlaybook AI...
      </main>
    );
  }

  if (!workbenchData) {
    return (
      <OnboardingWizard
        userId={initialData.profile.id}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  return (
    <TradingWorkbench
      data={workbenchData}
      onDataChange={handleDataChange}
      onReturnToOnboarding={handleReturnToOnboarding}
    />
  );
}

function createWorkbenchDataForTradingSystem(
  initialData: WorkbenchData,
  tradingSystem: UserTradingSystem
): WorkbenchData {
  const displaySymbol = tradingSystem.marketScope;
  const symbol = displaySymbol.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const timeframe = tradingSystem.timeframes[0] ?? "4H";
  const annotations = initialData.market.annotations.map((annotation) => ({
    ...annotation,
    symbol
  }));
  const signalDefinitions =
    tradingSystem.signalDefinitions?.map((signal) => ({
      ...signal,
      tradingSystemId: tradingSystem.id,
      timeframe
    })) ?? initialData.signalDefinitions;

  return {
    ...initialData,
    profile: {
      ...initialData.profile,
      tradingStyle: tradingSystem.tradingStyle
    },
    tradingSystem: {
      ...tradingSystem,
      signalDefinitions
    },
    market: {
      ...initialData.market,
      symbol,
      displayName: displaySymbol,
      annotations
    },
    tradeSignal: {
      ...initialData.tradeSignal,
      tradingSystemId: tradingSystem.id,
      symbol,
      timeframe,
      title: `${tradingSystem.tradingStyle} mock 信号`,
      relatedRuleIds: tradingSystem.rules.map((rule) => rule.id),
      annotations
    },
    signalDefinitions,
    currentPlan: initialData.currentPlan
      ? {
          ...initialData.currentPlan,
          symbol,
          timeframe,
          riskPercent: tradingSystem.maxRiskPerTradePercent,
          confirmationStatus: "pending",
          positionSizingNote: `按账户单笔 ${tradingSystem.maxRiskPerTradePercent}% 风险计算仓位，用户最终确认后才可执行。`,
          userConfirmationRequired: tradingSystem.userFinalConfirmationRequired
        }
      : null,
    reviewReports: initialData.reviewReports,
    backtestResult: {
      ...initialData.backtestResult,
      tradingSystemId: tradingSystem.id,
      symbol,
      timeframe
    },
    ruleSuggestions: initialData.ruleSuggestions,
    aiSuggestions: initialData.aiSuggestions,
    periodReports: initialData.periodReports
  };
}
