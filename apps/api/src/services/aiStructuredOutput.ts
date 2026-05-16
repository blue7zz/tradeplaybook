import type { AiResponse, SignalLight } from "@tradeplaybook/shared";

export function parseAiResponse(rawContent: string): AiResponse {
  const parsed = JSON.parse(extractJson(rawContent)) as Partial<AiResponse>;

  if (!parsed || typeof parsed.message !== "string" || !Array.isArray(parsed.actions)) {
    throw new Error("AI response is not valid structured JSON");
  }

  return {
    message: parsed.message,
    signalLight: normalizeSignalLight(parsed.signalLight),
    triggeredRules: Array.isArray(parsed.triggeredRules) ? parsed.triggeredRules : [],
    actions: parsed.actions
      .map((action) => normalizeAction(action))
      .filter((action): action is AiResponse["actions"][number] => Boolean(action))
  };
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

function normalizeSignalLight(value: unknown): SignalLight | undefined {
  if (value === "green" || value === "yellow" || value === "red") {
    return value;
  }

  return undefined;
}

function isAllowedActionType(value: unknown) {
  return (
    value === "MARK_CHART" ||
    value === "CREATE_TRADE_PLAN" ||
    value === "REJECT_TRADE_PLAN" ||
    value === "RUN_BACKTEST" ||
    value === "SUGGEST_RULE" ||
    value === "GENERATE_REVIEW"
  );
}

function normalizeAction(action: unknown): AiResponse["actions"][number] | null {
  if (!isRecord(action) || !isAllowedActionType(action.type)) {
    return null;
  }

  if (action.type === "RUN_BACKTEST") {
    const request = isRecord(action.backtestRequest)
      ? action.backtestRequest
      : isRecord(action.payload)
        ? action.payload
        : {};

    return {
      type: "RUN_BACKTEST",
      backtestRequest: {
        strategyName: "MA30",
        instId: normalizeInstId(request.instId ?? request.symbol),
        bar: normalizeBar(request.bar ?? request.timeframe),
        days: normalizeDays(request.days ?? request.period)
      }
    };
  }

  return action as unknown as AiResponse["actions"][number];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeInstId(value: unknown) {
  const text = String(value ?? "").toUpperCase().replace("/", "-");

  if (text.includes("ETH-USDT")) {
    return "ETH-USDT";
  }

  return "BTC-USDT";
}

function normalizeBar(value: unknown) {
  const text = String(value ?? "").toLowerCase();

  if (text === "1h" || text === "1H".toLowerCase()) {
    return "1H";
  }

  if (text === "4h" || text === "4H".toLowerCase()) {
    return "4H";
  }

  return "15m";
}

function normalizeDays(value: unknown) {
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    const parsed = match ? Number(match[0]) : Number.NaN;
    return clampDays(parsed);
  }

  return clampDays(Number(value));
}

function clampDays(value: number) {
  if (!Number.isFinite(value)) {
    return 90;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 365);
}
