import type {
  AiChatRequest,
  AiResponse,
  MarketInstrument,
  OnboardingChatRequest,
  OnboardingChatResponse,
  TradePlan
} from "@tradeplaybook/shared";
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

export async function createOnboardingChatResponse(
  payload: OnboardingChatRequest,
  instrument: MarketInstrument | null
): Promise<OnboardingChatResponse> {
  const generatedAt = new Date().toISOString();

  try {
    const ai = await callOnboardingAi(payload, instrument);

    return {
      message: ensureSafetyDisclosure(ai.message),
      source: "ai",
      actions: instrument ? [createSuggestMarketAction(instrument)] : [],
      instrument: instrument ?? undefined,
      generatedAt
    };
  } catch (error) {
    return {
      message: createOnboardingFallbackMessage(payload, instrument),
      source: "mock-fallback",
      actions: instrument ? [createSuggestMarketAction(instrument)] : [],
      instrument: instrument ?? undefined,
      error: error instanceof Error ? error.message : "AI request failed",
      generatedAt
    };
  }
}

export async function inferOnboardingInstrumentId(
  payload: OnboardingChatRequest
): Promise<{ instId: string | null; reason: string; source: "ai" | "fallback" }> {
  try {
    const ai = await callOnboardingInstrumentInference(payload);

    return {
      instId: normalizeInferredInstrumentId(ai.instId),
      reason: ai.reason || "AI 已识别用户想查询的交易对。",
      source: "ai"
    };
  } catch {
    return inferOnboardingInstrumentIdFallback(payload.message);
  }
}

async function callOnboardingInstrumentInference(
  payload: OnboardingChatRequest
): Promise<{ instId?: string | null; reason?: string }> {
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
      messages: [
        {
          role: "system",
          content: [
            "你是 TradePlaybook AI 的交易对识别器。",
            "根据用户自然语言，判断他是否想添加或查询一个 OKX SPOT 交易对。",
            "把中文币种名转换为常见 symbol，例如 波场=TRX，瑞波=XRP，比特币=BTC，以太坊=ETH，狗狗币=DOGE。",
            "如果用户只说币种，默认计价币为 USDT。",
            "只返回 JSON：{\"instId\":\"TRX-USDT\",\"reason\":\"...\"}。",
            "如果没有明确币种，返回 {\"instId\":null,\"reason\":\"未识别到明确交易对\"}。"
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            userMessage: payload.message,
            currentStep: payload.stepTitle,
            currentMarketScope: payload.answers.marketScope
          })
        }
      ],
      temperature: 0,
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AI instrument inference failed with ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI instrument inference response is empty");
  }

  return JSON.parse(extractJson(content)) as { instId?: string | null; reason?: string };
}

function inferOnboardingInstrumentIdFallback(message: string): {
  instId: string | null;
  reason: string;
  source: "fallback";
} {
  const normalized = message.toUpperCase().replace(/\s+/g, "");
  const pairMatch = normalized.match(/\b([A-Z0-9]{2,12})[-/]([A-Z0-9]{2,8})\b/);

  if (pairMatch) {
    return {
      instId: `${pairMatch[1]}-${pairMatch[2]}`,
      reason: "本地规则从输入中识别到明确交易对。",
      source: "fallback"
    };
  }

  const aliasMap: Array<[RegExp, string]> = [
    [/波场|TRON|TRX/i, "TRX-USDT"],
    [/瑞波|XRP/i, "XRP-USDT"],
    [/比特币|BTC/i, "BTC-USDT"],
    [/以太坊|以太|ETH/i, "ETH-USDT"],
    [/狗狗币|DOGE/i, "DOGE-USDT"],
    [/索拉纳|SOL/i, "SOL-USDT"],
    [/莱特币|LTC/i, "LTC-USDT"],
    [/艾达|ADA/i, "ADA-USDT"]
  ];
  const matchedAlias = aliasMap.find(([pattern]) => pattern.test(message));

  return {
    instId: matchedAlias?.[1] ?? null,
    reason: matchedAlias ? "本地别名规则识别到币种。" : "未识别到明确交易对。",
    source: "fallback"
  };
}

function normalizeInferredInstrumentId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace("/", "-");

  if (!/^[A-Z0-9]{2,12}-[A-Z0-9]{2,8}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

async function callOnboardingAi(
  payload: OnboardingChatRequest,
  instrument: MarketInstrument | null
): Promise<{ message: string }> {
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
      messages: [
        {
          role: "system",
          content: [
            "你是 TradePlaybook AI 的新用户交易体系初始化助手。",
            "你不是自动交易机器人，不是喊单系统，不承诺盈利。",
            "你只能辅助用户建立交易体系，不能让用户直接交易，也不能自动下单。",
            "所有交易相关回复必须强调：辅助决策，不是投资建议，用户最终确认。",
            "如果 OKX instrument 存在，请简短介绍该交易对，并询问用户是否加入交易品种范围。",
            "如果 OKX instrument 不存在，请说明未在 OKX SPOT 公开交易对中找到，并建议用户检查拼写。",
            "只返回 JSON：{\"message\":\"...\"}，不要返回 markdown。"
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            userMessage: payload.message,
            currentStep: {
              key: payload.stepKey,
              title: payload.stepTitle
            },
            onboardingAnswers: payload.answers,
            okxInstrument: instrument
          })
        }
      ],
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

  const parsed = JSON.parse(extractJson(content)) as Partial<{ message: string }>;

  if (!parsed.message) {
    throw new Error("AI onboarding response is not valid JSON");
  }

  return {
    message: parsed.message
  };
}

function createSuggestMarketAction(instrument: MarketInstrument) {
  return {
    type: "SUGGEST_MARKET" as const,
    marketScope: instrument.displayName,
    instrument
  };
}

function createOnboardingFallbackMessage(
  payload: OnboardingChatRequest,
  instrument: MarketInstrument | null
) {
  if (instrument) {
    return `${instrument.displayName} 已在 OKX SPOT 公开交易对中找到，状态为 ${instrument.state ?? "未知"}。它的基础币是 ${instrument.baseCurrency ?? "未知"}，计价币是 ${instrument.quoteCurrency ?? "未知"}。是否把它加入你的交易品种范围？辅助决策，不是投资建议，所有执行都需要用户最终确认。`;
  }

  return `我已收到：“${payload.message}”。当前没有在 OKX SPOT 公开交易对中确认到可加入的交易对；请检查拼写，例如 XRP/USDT。辅助决策，不是投资建议。`;
}

function ensureSafetyDisclosure(message: string) {
  if (message.includes("不是投资建议") || message.includes("不构成投资建议")) {
    return message;
  }

  return `${message} 辅助决策，不是投资建议，所有执行都需要用户最终确认。`;
}

function extractJson(rawContent: string) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("AI response did not contain JSON");
  }

  return match[0];
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
