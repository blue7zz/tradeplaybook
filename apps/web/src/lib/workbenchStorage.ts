import type { WorkbenchData } from "@tradeplaybook/shared";

const WORKBENCH_STORAGE_KEY = "tradeplaybook.workbench.v1";

export function loadStoredWorkbenchData(fallback: WorkbenchData): WorkbenchData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKBENCH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeWorkbenchData(JSON.parse(raw) as Partial<WorkbenchData>, fallback);
  } catch {
    try {
      window.localStorage.removeItem(WORKBENCH_STORAGE_KEY);
    } catch {
      return null;
    }

    return null;
  }
}

export function saveStoredWorkbenchData(data: WorkbenchData) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 失败不影响 MVP 主流程，用户仍可在当前会话内使用工作台。
  }
}

function normalizeWorkbenchData(
  stored: Partial<WorkbenchData>,
  fallback: WorkbenchData
): WorkbenchData {
  const tradingSystem = stored.tradingSystem ?? fallback.tradingSystem;

  return {
    ...fallback,
    ...stored,
    profile: {
      ...fallback.profile,
      ...stored.profile
    },
    tradingSystem: {
      ...fallback.tradingSystem,
      ...tradingSystem,
      rules: tradingSystem.rules ?? fallback.tradingSystem.rules,
      forbiddenRules: tradingSystem.forbiddenRules ?? fallback.tradingSystem.forbiddenRules
    },
    market: {
      ...fallback.market,
      ...stored.market,
      candles: stored.market?.candles ?? fallback.market.candles,
      annotations: stored.market?.annotations ?? fallback.market.annotations,
      indicators: stored.market?.indicators ?? fallback.market.indicators
    },
    tradeSignal: {
      ...fallback.tradeSignal,
      ...stored.tradeSignal
    },
    signalDefinitions:
      stored.signalDefinitions ??
      stored.tradingSystem?.signalDefinitions ??
      fallback.signalDefinitions,
    currentPlan: stored.currentPlan ?? fallback.currentPlan,
    review: stored.review ?? fallback.review,
    tradeRecords: stored.tradeRecords ?? fallback.tradeRecords,
    reviewReports: stored.reviewReports ?? fallback.reviewReports,
    backtestResult: stored.backtestResult ?? fallback.backtestResult,
    ruleSuggestions: stored.ruleSuggestions ?? fallback.ruleSuggestions,
    aiSuggestions: stored.aiSuggestions ?? fallback.aiSuggestions,
    periodReports: stored.periodReports ?? fallback.periodReports,
    messages: stored.messages ?? fallback.messages
  };
}
