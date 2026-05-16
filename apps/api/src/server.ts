import "./config/loadEnv.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  mockBlockedReview,
  mockReview,
  mockWorkbenchData
} from "@tradeplaybook/mock-data";
import type {
  AiChatRequest,
  AiChatResponse,
  ApiHealthResponse,
  MarketCandlesResponse,
  MarketHistoryCandlesResponse,
  OnboardingChatRequest,
  OnboardingChatResponse,
  ReviewPlanRequest,
  ReviewPlanResponse
} from "@tradeplaybook/shared";
import {
  callStructuredAi,
  createMockAiFallback,
  createOnboardingChatResponse,
  inferOnboardingInstrumentId
} from "./services/aiClient.js";
import { runMa30Backtest } from "./services/backtestMa30.js";
import { fetchConfirmedHistoryKlines } from "./services/historyCandlesService.js";
import {
  createMockFallbackKlines,
  normalizeLimit,
  parseSupportedBar,
  parseSupportedInstId
} from "./services/klineAdapter.js";
import { fetchOkxCandles, fetchOkxSpotInstrument } from "./services/okxMarketClient.js";

const port = Number(process.env.PORT ?? 4000);

function sendJson<T>(res: ServerResponse, statusCode: number, body: T) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendSseEvent(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function readJson<T>(req: IncomingMessage): Promise<T | null> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch {
    return null;
  }
}

function reviewIdea(idea: string) {
  const blockedKeywords = ["追单", "报复", "扩大止损", "满仓", "all in"];
  const shouldBlock = blockedKeywords.some((keyword) =>
    idea.toLowerCase().includes(keyword.toLowerCase())
  );

  return shouldBlock ? mockBlockedReview : mockReview;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const response: ApiHealthResponse = {
      status: "ok",
      service: "tradeplaybook-api",
      mock: true
    };
    sendJson(res, 200, response);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/workbench") {
    sendJson(res, 200, mockWorkbenchData);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/market/candles") {
    const instId = parseSupportedInstId(url.searchParams.get("instId"));
    const bar = parseSupportedBar(url.searchParams.get("bar"));
    const limit = normalizeLimit(url.searchParams.get("limit"));

    if (!instId || !bar) {
      sendJson(res, 400, {
        error: "Only BTC-USDT / ETH-USDT and 15m / 1H / 4H are supported"
      });
      return;
    }

    try {
      const klines = await fetchOkxCandles({ instId, bar, limit });
      const response: MarketCandlesResponse = {
        instId,
        bar,
        source: "okx",
        klines,
        fallback: false,
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    } catch (error) {
      const response: MarketCandlesResponse = {
        instId,
        bar,
        source: "mock",
        klines: createMockFallbackKlines(instId),
        fallback: true,
        error: error instanceof Error ? error.message : "OKX request failed",
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/market/history-candles") {
    const instId = parseSupportedInstId(url.searchParams.get("instId"));
    const bar = parseSupportedBar(url.searchParams.get("bar"));
    const days = normalizeDays(url.searchParams.get("days"));

    if (!instId || !bar) {
      sendJson(res, 400, {
        error: "Only BTC-USDT / ETH-USDT and 15m / 1H / 4H are supported"
      });
      return;
    }

    try {
      const klines = await fetchConfirmedHistoryKlines(instId, bar, days);
      const response: MarketHistoryCandlesResponse = {
        instId,
        bar,
        days,
        source: "okx",
        klines,
        fallback: false,
        confirmedOnly: true,
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    } catch (error) {
      const response: MarketHistoryCandlesResponse = {
        instId,
        bar,
        days,
        source: "mock",
        klines: createMockFallbackKlines(instId),
        fallback: true,
        confirmedOnly: true,
        error: error instanceof Error ? error.message : "OKX history request failed",
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/backtest/ma30") {
    const instId = parseSupportedInstId(url.searchParams.get("instId"));
    const bar = parseSupportedBar(url.searchParams.get("bar"));
    const days = normalizeDays(url.searchParams.get("days"));

    if (!instId || !bar) {
      sendJson(res, 400, {
        error: "Only BTC-USDT / ETH-USDT and 15m / 1H / 4H are supported"
      });
      return;
    }

    try {
      const klines = await fetchConfirmedHistoryKlines(instId, bar, days);
      sendJson(res, 200, {
        result: runMa30Backtest(klines, instId, bar, days),
        source: "okx",
        fallback: false,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      const klines = createMockFallbackKlines(instId);
      sendJson(res, 200, {
        result: runMa30Backtest(klines, instId, bar, days),
        source: "mock",
        fallback: true,
        error: error instanceof Error ? error.message : "OKX history request failed",
        generatedAt: new Date().toISOString()
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/review-plan") {
    const payload = await readJson<ReviewPlanRequest>(req);

    if (!payload?.idea) {
      sendJson(res, 400, {
        error: "idea is required"
      });
      return;
    }

    const response: ReviewPlanResponse = {
      review: reviewIdea(payload.idea),
      source: "mock-rule-engine",
      generatedAt: new Date().toISOString()
    };

    sendJson(res, 200, response);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ai/chat") {
    const payload = await readJson<AiChatRequest>(req);

    if (!isAiChatRequest(payload)) {
      sendJson(res, 400, {
        error: "message, context.tradingSystem, context.market and context.currentPlan are required"
      });
      return;
    }

    try {
      const response: AiChatResponse = {
        ai: await callStructuredAi(payload),
        source: "ai",
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    } catch (error) {
      const response: AiChatResponse = {
        ai: createMockAiFallback(payload),
        source: "mock-fallback",
        error: error instanceof Error ? error.message : "AI request failed",
        generatedAt: new Date().toISOString()
      };
      sendJson(res, 200, response);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ai/onboarding-chat-stream") {
    const payload = await readJson<OnboardingChatRequest>(req);

    if (!isOnboardingChatRequest(payload)) {
      sendJson(res, 400, {
        error: "message, stepKey, stepTitle and answers are required"
      });
      return;
    }

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "access-control-allow-origin": "*"
    });

    try {
      sendSseEvent(res, "progress", {
        step: "context",
        message: "正在整理当前步骤、已选交易品种、周期、风格、风险参数。"
      });

      const inferred = await inferOnboardingInstrumentId(payload);
      sendSseEvent(res, "progress", {
        step: "ai_inference",
        message: inferred.instId
          ? `AI 识别到候选交易对 ${inferred.instId}，来源：${inferred.source}。`
          : `AI 未识别到明确交易对：${inferred.reason}`
      });

      sendSseEvent(res, "progress", {
        step: "okx_lookup",
        message: inferred.instId
          ? `正在调用 OKX SPOT 公开交易对查询：${inferred.instId}。`
          : "跳过 OKX 查询，等待 AI 给出补充问题。"
      });

      const instrument = inferred.instId
        ? await fetchOkxSpotInstrument(inferred.instId)
        : null;

      sendSseEvent(res, "progress", {
        step: "okx_result",
        message: instrument
          ? `OKX 已确认 ${instrument.displayName}，状态 ${instrument.state ?? "未知"}。`
          : "OKX 未确认该 SPOT 交易对。"
      });

      sendSseEvent(res, "progress", {
        step: "ai_response",
        message: "正在让 AI 根据 OKX 查询结果和当前体系草稿生成可回显建议。"
      });

      const response = await createOnboardingChatResponse(payload, instrument);
      sendSseEvent(res, "final", response);
    } catch (error) {
      sendSseEvent(res, "error", {
        message: "AI 引导流程暂时失败，可以先使用快捷选项继续。",
        error: error instanceof Error ? error.message : "Onboarding stream failed"
      });
    } finally {
      res.end();
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ai/onboarding-chat") {
    const payload = await readJson<OnboardingChatRequest>(req);

    if (!isOnboardingChatRequest(payload)) {
      sendJson(res, 400, {
        error: "message, stepKey, stepTitle and answers are required"
      });
      return;
    }

    try {
      const inferred = await inferOnboardingInstrumentId(payload);
      const instrument = inferred.instId
        ? await fetchOkxSpotInstrument(inferred.instId)
        : null;
      const response: OnboardingChatResponse = await createOnboardingChatResponse(
        payload,
        instrument
      );

      sendJson(res, 200, response);
    } catch (error) {
      const response: OnboardingChatResponse = {
        message:
          "我暂时无法完成 OKX 交易对查询。请稍后再试；辅助决策，不是投资建议。",
        source: "mock-fallback",
        actions: [],
        error: error instanceof Error ? error.message : "Onboarding AI request failed",
        generatedAt: new Date().toISOString()
      };

      sendJson(res, 200, response);
    }
    return;
  }

  sendJson(res, 404, {
    error: "not found"
  });
});

server.listen(port, () => {
  console.log(`TradePlaybook API listening on http://localhost:${port}`);
});

function normalizeDays(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 90;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 365);
}

function isAiChatRequest(payload: AiChatRequest | null): payload is AiChatRequest {
  return (
    Boolean(payload) &&
    typeof payload?.message === "string" &&
    payload.message.trim().length > 0 &&
    Boolean(payload.context) &&
    Boolean(payload.context.tradingSystem) &&
    Boolean(payload.context.market) &&
    "currentPlan" in payload.context
  );
}

function isOnboardingChatRequest(
  payload: OnboardingChatRequest | null
): payload is OnboardingChatRequest {
  return (
    Boolean(payload) &&
    typeof payload?.message === "string" &&
    payload.message.trim().length > 0 &&
    typeof payload.stepKey === "string" &&
    typeof payload.stepTitle === "string" &&
    Boolean(payload.answers) &&
    typeof payload.answers.marketScope === "string" &&
    Array.isArray(payload.answers.timeframes) &&
    typeof payload.answers.tradingStyle === "string"
  );
}
