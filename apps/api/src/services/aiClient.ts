import type { AiChatRequest, AiResponse, TradePlan } from "@tradeplaybook/shared";
import { buildAiMessages } from "./aiPrompt.js";
import { parseAiResponse } from "./aiStructuredOutput.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.deepseek.com";
const AI_MODEL = process.env.AI_MODEL ?? "deepseek-v4-pro";

export async function callStructuredAi(payload: AiChatRequest): Promise<AiResponse> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured on the server");
  }

  const url = new URL("/chat/completions", AI_BASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: buildAiMessages(payload),
      temperature: 0.2,
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response is empty");
  }

  return parseAiResponse(content);
}

export function createMockAiFallback(payload: AiChatRequest): AiResponse {
  const message = payload.message;
  const createdAt = new Date().toISOString();

  if (message.includes("做空") && payload.context.market.trend === "up") {
    return {
      message:
        "红灯：当前趋势上涨，用户交易体系禁止上涨趋势中逆势做空。辅助决策，不是投资建议；禁止生成执行计划。",
      signalLight: "red",
      triggeredRules: payload.context.tradingSystem.forbiddenRules,
      actions: [
        {
          type: "REJECT_TRADE_PLAN",
          rejectionReason: "当前趋势上涨，禁止逆势做空。"
        }
      ]
    };
  }

  if ((message.includes("30均线") || message.toLowerCase().includes("ma30")) && message.includes("回测")) {
    return {
      message:
        "已识别 MA30 回测请求。系统将使用 OKX confirmed 历史 K 线做基础回测；结果仅用于辅助决策，不是投资建议。",
      signalLight: "green",
      actions: [
        {
          type: "RUN_BACKTEST",
          backtestRequest: {
            strategyName: "MA30",
            instId: "BTC-USDT",
            bar: "15m",
            days: 90
          }
        }
      ]
    };
  }

  if (looksLikeTradeIdea(message) && lacksExplicitStopLoss(message)) {
    return {
      message:
        "黄灯：交易想法缺少明确止损或失效条件。请先补充入场区、止损价和放弃交易条件；辅助决策，不是投资建议。",
      signalLight: "yellow",
      actions: [
        {
          type: "MARK_CHART",
          mark: {
            kind: "reviewMarker",
            symbol: payload.context.market.symbol,
            time: createdAt,
            price: payload.context.market.price,
            label: "补充止损",
            note: "缺少明确止损，不能生成执行计划。"
          }
        }
      ]
    };
  }

  if (looksLikeTradeIdea(message)) {
    const plan = createFallbackTradePlan(payload);

    return {
      message: `绿灯：该想法没有触发当前核心禁止规则，已生成计划草案。入场 ${plan.entryPrice}，止损 ${plan.stopLossPrice}，止盈 ${plan.takeProfitPrice}。辅助决策，不是投资建议，用户最终确认后才可执行。`,
      signalLight: "green",
      actions: [
        {
          type: "CREATE_TRADE_PLAN",
          tradePlan: plan
        }
      ]
    };
  }

  return {
    message:
      "已收到交易想法。当前 AI 服务不可用，系统先用本地安全规则处理；辅助决策，不是投资建议，用户最终确认后才可执行。",
    signalLight: "yellow",
    actions: [
      {
        type: "MARK_CHART",
        mark: {
          kind: "reviewMarker",
          symbol: payload.context.market.symbol,
          time: createdAt,
          price: payload.context.market.price,
          label: "等待 AI",
          note: "AI 服务不可用，使用本地 fallback。"
        }
      }
    ]
  };
}

function looksLikeTradeIdea(message: string) {
  return ["做多", "做空", "买入", "卖出", "开仓", "入场"].some((keyword) => message.includes(keyword));
}

function lacksExplicitStopLoss(message: string) {
  return !["止损", "失效", "跌破", "突破失败"].some((keyword) => message.includes(keyword));
}

function createFallbackTradePlan(payload: AiChatRequest): TradePlan {
  const price = payload.context.market.price;
  const roundPrice = (value: number) => Math.round(value / 10) * 10;
  const entryPrice = roundPrice(price * 0.988);
  const stopLossPrice = roundPrice(price * 0.97);
  const takeProfitPrice = roundPrice(price * 1.03);
  const risk = Math.max(entryPrice - stopLossPrice, 1);
  const reward = Math.max(takeProfitPrice - entryPrice, 1);

  return {
    id: `plan_ai_fallback_${Date.now()}`,
    symbol: payload.context.market.symbol,
    timeframe: payload.context.tradingSystem.timeframes[0] ?? "4H",
    direction: payload.message.includes("做空") ? "short" : "long",
    planStatus: "draft",
    confirmationStatus: "pending",
    light: "green",
    entryZone: `${roundPrice(entryPrice * 0.998)} - ${roundPrice(entryPrice * 1.002)}`,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    invalidationCondition: `如果价格跌破 ${stopLossPrice} 或缺少确认信号，计划失效。`,
    riskRewardRatio: Number((reward / risk).toFixed(2)),
    riskPercent: payload.context.tradingSystem.maxRiskPerTradePercent,
    positionSizingNote: `按账户单笔 ${payload.context.tradingSystem.maxRiskPerTradePercent}% 风险计算仓位。辅助决策，不是投资建议，用户最终确认后才可执行。`,
    executionChecklist: ["确认入场区。", "确认止损与失效条件。", "确认没有触发核心禁止规则。"],
    reviewFocus: ["是否等待确认信号", "是否按计划执行止损"],
    rationale: ["AI 服务 fallback 基于本地安全规则生成计划草案。", "没有接入自动交易或真钱执行。"],
    userConfirmationRequired: true,
    createdAt: new Date().toISOString()
  };
}
