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
  ReviewPlanRequest,
  ReviewPlanResponse
} from "@tradeplaybook/shared";
import { callStructuredAi, createMockAiFallback } from "./services/aiClient.js";
import { runMa30Backtest } from "./services/backtestMa30.js";
import { fetchConfirmedHistoryKlines } from "./services/historyCandlesService.js";
import {
  createMockFallbackKlines,
  normalizeLimit,
  parseSupportedBar,
  parseSupportedInstId
} from "./services/klineAdapter.js";
import { fetchOkxCandles } from "./services/okxMarketClient.js";

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
