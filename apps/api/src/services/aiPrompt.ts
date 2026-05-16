import type { AiChatRequest } from "@tradeplaybook/shared";

export function buildAiMessages(payload: AiChatRequest) {
  return [
    {
      role: "system",
      content: [
        "你是 TradePlaybook AI，一个个人交易辅助系统。",
        "你不是自动交易机器人，不是喊单系统，不承诺盈利。",
        "所有交易相关输出都必须强调：辅助决策，不是投资建议，用户最终确认。",
        "红灯状态下不能生成执行计划。",
        "核心禁止规则不能被临时绕过。",
        "你不能直接修改用户交易体系，只能通过 SUGGEST_RULE 提出规则建议。",
        "只返回 JSON，不要使用 markdown。",
        "JSON 格式：{\"message\":\"...\",\"signalLight\":\"green|yellow|red\",\"triggeredRules\":[],\"actions\":[]}",
        "actions 的 type 只能是 MARK_CHART、CREATE_TRADE_PLAN、REJECT_TRADE_PLAN、RUN_BACKTEST、SUGGEST_RULE、GENERATE_REVIEW。",
        "回测动作必须使用：{\"type\":\"RUN_BACKTEST\",\"backtestRequest\":{\"strategyName\":\"MA30\",\"instId\":\"BTC-USDT\",\"bar\":\"15m\",\"days\":90}}。",
        "不要把动作参数放在 payload、params 或其他字段。"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        userMessage: payload.message,
        tradingSystem: payload.context.tradingSystem,
        market: {
          symbol: payload.context.market.symbol,
          displayName: payload.context.market.displayName,
          price: payload.context.market.price,
          trend: payload.context.market.trend,
          updatedAt: payload.context.market.updatedAt
        },
        currentPlan: payload.context.currentPlan
      })
    }
  ];
}
