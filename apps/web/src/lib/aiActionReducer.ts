import type {
  AiAction,
  AiResponse,
  AssistantMessage,
  BacktestResult,
  ChartAnnotation,
  ChartMarkPayload,
  ReviewReport,
  RuleSuggestion,
  TradePlan,
  WorkbenchData
} from "@tradeplaybook/shared";
import { fetchMa30Backtest, postAiChat } from "./marketApi";

export async function handleAiChatWithActions(data: WorkbenchData, idea: string): Promise<WorkbenchData> {
  const aiResponse = await postAiChat({
    message: idea,
    context: {
      tradingSystem: data.tradingSystem,
      market: data.market,
      currentPlan: data.currentPlan
    }
  });

  const backtestAction = aiResponse.ai.actions.find((action) => action.type === "RUN_BACKTEST");
  const backtestResult =
    backtestAction?.backtestRequest?.strategyName === "MA30"
      ? await fetchMa30Backtest(
          backtestAction.backtestRequest.instId,
          backtestAction.backtestRequest.bar,
          backtestAction.backtestRequest.days
        )
      : undefined;

  return applyAiResponse(data, idea, aiResponse.ai, backtestResult?.result);
}

export function applyAiResponse(
  data: WorkbenchData,
  userInput: string,
  ai: AiResponse,
  backtestResult?: BacktestResult
): WorkbenchData {
  const createdAt = new Date().toISOString();
  const userMessage: AssistantMessage = {
    id: `msg_user_ai_${Date.now()}`,
    role: "user",
    content: userInput,
    createdAt
  };
  const assistantMessage: AssistantMessage = {
    id: `msg_assistant_ai_${Date.now()}`,
    role: "assistant",
    content: ai.message,
    createdAt
  };
  const isRed = ai.signalLight === "red" || ai.actions.some((action) => action.type === "REJECT_TRADE_PLAN");
  const annotations = ai.actions
    .filter((action) => action.type === "MARK_CHART" && action.mark)
    .map((action, index) => chartMarkToAnnotation(action.mark as ChartMarkPayload, index));
  const createPlanAction = ai.actions.find((action) => action.type === "CREATE_TRADE_PLAN");
  const suggestedRules = ai.actions
    .filter((action): action is AiAction & { ruleSuggestion: RuleSuggestion } =>
      action.type === "SUGGEST_RULE" && Boolean(action.ruleSuggestion)
    )
    .map((action) => ({
      ...action.ruleSuggestion,
      status: "pending" as const
    }));
  const generatedReview = ai.actions.find((action) => action.type === "GENERATE_REVIEW")?.reviewReport;
  const review = generatedReview ?? createReviewFromAi(ai, createdAt);

  if (isRed) {
    return {
      ...data,
      currentPlan: null,
      review: {
        ...review,
        light: "red",
        canGenerateExecutionPlan: false,
        finalConfirmationRequired: false,
        summary: ai.message
      },
      market: {
        ...data.market,
        annotations,
        indicators: []
      },
      ruleSuggestions: mergeRuleSuggestions(data.ruleSuggestions, suggestedRules),
      messages: [...data.messages, userMessage, assistantMessage]
    };
  }

  if (backtestResult) {
    return {
      ...data,
      review,
      backtestResult,
      market: {
        ...data.market,
        annotations: [...(backtestResult.annotations ?? []), ...annotations],
        indicators: backtestResult.indicators ?? data.market.indicators
      },
      ruleSuggestions: mergeRuleSuggestions(data.ruleSuggestions, suggestedRules),
      messages: [...data.messages, userMessage, assistantMessage]
    };
  }

  const nextPlan = createPlanAction?.tradePlan
    ? sanitizePlan(createPlanAction.tradePlan, data)
    : data.currentPlan;

  return {
    ...data,
    currentPlan: nextPlan,
    review,
    reviewReports: generatedReview ? [generatedReview, ...data.reviewReports] : data.reviewReports,
    market: {
      ...data.market,
      annotations: nextPlan ? [...planToAnnotations(nextPlan), ...annotations] : annotations,
      indicators: data.market.indicators
    },
    ruleSuggestions: mergeRuleSuggestions(data.ruleSuggestions, suggestedRules),
    messages: [...data.messages, userMessage, assistantMessage]
  };
}

function createReviewFromAi(ai: AiResponse, reviewedAt: string): ReviewReport {
  const light = ai.signalLight ?? "yellow";

  return {
    id: `review_ai_${Date.now()}`,
    light,
    summary: ai.message,
    findings: (ai.triggeredRules ?? []).map((rule) => ({
      id: `finding_ai_${rule.id}`,
      level: light === "red" ? "block" : "warning",
      title: rule.title,
      message: rule.description,
      ruleId: rule.id
    })),
    canGenerateExecutionPlan: light !== "red",
    finalConfirmationRequired: light !== "red",
    reviewTasks:
      light === "red"
        ? ["记录红灯原因。", "不要生成执行计划。"]
        : ["执行前再次确认入场、止损、止盈。", "辅助决策，不是投资建议，用户最终确认。"],
    reviewedAt
  };
}

function sanitizePlan(plan: TradePlan, data: WorkbenchData): TradePlan {
  return {
    ...plan,
    id: plan.id || `plan_ai_${Date.now()}`,
    symbol: plan.symbol || data.market.symbol,
    timeframe: plan.timeframe || data.tradingSystem.timeframes[0] || "4H",
    planStatus: "draft",
    confirmationStatus: "pending",
    light: "green",
    userConfirmationRequired: true,
    positionSizingNote:
      plan.positionSizingNote ||
      `按账户单笔 ${data.tradingSystem.maxRiskPerTradePercent}% 风险计算仓位，辅助决策，不是投资建议，用户最终确认后才可执行。`,
    createdAt: plan.createdAt || new Date().toISOString()
  };
}

function planToAnnotations(plan: TradePlan): ChartAnnotation[] {
  return [
    {
      id: `ann_entry_${plan.id}`,
      symbol: plan.symbol,
      time: "当前",
      price: plan.entryPrice,
      label: "入场",
      type: "entry",
      relatedId: plan.id
    },
    {
      id: `ann_stop_${plan.id}`,
      symbol: plan.symbol,
      time: "当前",
      price: plan.stopLossPrice,
      label: "止损",
      type: "stop",
      relatedId: plan.id
    },
    {
      id: `ann_target_${plan.id}`,
      symbol: plan.symbol,
      time: "当前",
      price: plan.takeProfitPrice,
      label: "止盈",
      type: "target",
      relatedId: plan.id
    }
  ];
}

function chartMarkToAnnotation(mark: ChartMarkPayload, index: number): ChartAnnotation {
  return {
    id: `ann_ai_${mark.kind}_${Date.now()}_${index}`,
    symbol: mark.symbol,
    time: String(mark.time),
    price: mark.price,
    label: mark.label,
    type: chartKindToAnnotationType(mark.kind),
    note: mark.note
  };
}

function chartKindToAnnotationType(kind: ChartMarkPayload["kind"]): ChartAnnotation["type"] {
  const map: Record<ChartMarkPayload["kind"], ChartAnnotation["type"]> = {
    entryZone: "entry",
    stopLossLine: "stop",
    takeProfitLine: "target",
    invalidationLine: "invalid",
    supportZone: "signal",
    resistanceZone: "signal",
    buyMarker: "backtestBuy",
    sellMarker: "backtestSell",
    reviewMarker: "review"
  };

  return map[kind];
}

function mergeRuleSuggestions(current: RuleSuggestion[], incoming: RuleSuggestion[]) {
  const existingIds = new Set(current.map((suggestion) => suggestion.id));
  const uniqueIncoming = incoming.filter((suggestion) => !existingIds.has(suggestion.id));

  return [...uniqueIncoming, ...current];
}
