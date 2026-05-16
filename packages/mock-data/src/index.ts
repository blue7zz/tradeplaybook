import type {
  AiSuggestion,
  AssistantMessage,
  BacktestResult,
  ChartAnnotation,
  Kline,
  MarketSnapshot,
  PeriodReport,
  ReviewReport,
  RuleSuggestion,
  SignalDefinition,
  TradePlan,
  TradeRecord,
  TradeSignal,
  UserProfile,
  UserTradingSystem,
  WorkbenchData
} from "@tradeplaybook/shared";

const mockTradingSystemId = "system_mock_001";

export const mockUserProfile: UserProfile = {
  id: "user_mock_001",
  displayName: "个人交易者",
  tradingStyle: "趋势回调交易",
  riskMode: "纪律优先"
};

export const mockSignalDefinitions: SignalDefinition[] = [
  {
    id: "signal_def_pullback_001",
    tradingSystemId: mockTradingSystemId,
    name: "趋势回调确认",
    direction: "long",
    timeframe: "4H",
    triggerConditions: ["4H 主趋势向上", "价格回到计划区", "出现收盘确认或支撑反应"],
    invalidationConditions: ["4H 收盘跌破结构止损", "价格追离入场区超过 1.2%"],
    confirmationRequired: true,
    displayLabel: "回调确认"
  },
  {
    id: "signal_def_ma30_001",
    tradingSystemId: mockTradingSystemId,
    name: "MA30 趋势过滤",
    direction: "long",
    timeframe: "4H",
    triggerConditions: ["价格站上 MA30", "MA30 斜率向上", "回踩 MA30 不跌破"],
    invalidationConditions: ["价格重新跌破 MA30", "连续两根 K 线收在 MA30 下方"],
    confirmationRequired: true,
    displayLabel: "MA30"
  }
];

export const mockTradingSystem: UserTradingSystem = {
  id: mockTradingSystemId,
  userId: mockUserProfile.id,
  name: "趋势回调 MVP 体系",
  version: "0.1.0",
  marketScope: "BTC/USDT",
  timeframes: ["4H", "1D"],
  tradingStyle: "顺 4H 主趋势，只做回调确认后的计划",
  maxRiskPerTradePercent: 1,
  maxDailyLossPercent: 3,
  maxDailyTradeCount: 3,
  commonMistakes: ["追单", "临时扩大止损", "止损后立刻开仓"],
  preferredSignals: ["趋势回调", "支撑压力反应", "收盘确认"],
  positionSizingRule: {
    id: "position_rule_mock_001",
    title: "固定风险百分比仓位",
    riskPerTradePercent: 1,
    maxDailyLossPercent: 3,
    afterLossAdjustment: "连续 2 笔亏损后，下一笔只允许观察或降为 0.5% 风险。",
    note: "仓位说明只用于计划草案，任何执行都需要用户最终确认。"
  },
  signalDefinitions: mockSignalDefinitions,
  userFinalConfirmationRequired: true,
  updatedAt: "2026-05-15T12:00:00.000Z",
  rules: [
    {
      id: "rule_trend_001",
      title: "只顺 4H 主趋势交易",
      description: "价格保持在关键均线上方时，只寻找回调后的多头计划。",
      category: "entry",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "rule_risk_001",
      title: "单笔风险不超过 1%",
      description: "每笔交易先确定止损，再按账户风险计算仓位。",
      category: "risk",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "rule_confirm_001",
      title: "入场前必须等待确认信号",
      description: "没有收盘确认、结构确认或量能确认时，不生成执行计划。",
      category: "entry",
      severity: "warning",
      status: "active",
      canBeTemporarilyBypassed: true
    }
  ],
  forbiddenRules: [
    {
      id: "ban_revenge_001",
      title: "禁止亏损后报复性开仓",
      description: "触发止损后必须冷静复盘，不能马上扩大仓位追回亏损。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "ban_stop_001",
      title: "禁止临时扩大止损",
      description: "计划确认后，不能因为价格接近止损而临时放宽止损。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "ban_chase_001",
      title: "禁止追单",
      description: "价格已经离开计划入场区后，不生成追价执行计划。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    }
  ]
};

export const mockChartAnnotations: ChartAnnotation[] = [
  {
    id: "ann_signal_001",
    symbol: "BTCUSDT",
    time: "05-15",
    price: 67600,
    label: "计划入场区",
    type: "entry",
    relatedId: "plan_mock_001",
    note: "回调到计划区后等待确认信号。"
  },
  {
    id: "ann_stop_001",
    symbol: "BTCUSDT",
    time: "05-15",
    price: 66400,
    label: "结构止损",
    type: "stop",
    relatedId: "plan_mock_001",
    note: "跌破结构低点后计划失效。"
  },
  {
    id: "ann_target_001",
    symbol: "BTCUSDT",
    time: "05-15",
    price: 70400,
    label: "第一目标",
    type: "target",
    relatedId: "plan_mock_001",
    note: "第一止盈目标，用户确认后才可执行。"
  }
];

export const mockKlines: Kline[] = [
  { time: 1778371200, timeISO: "2026-05-10T00:00:00.000Z", open: 64200, high: 65120, low: 63680, close: 64840, volume: 1180, confirmed: true, source: "mock" },
  { time: 1778457600, timeISO: "2026-05-11T00:00:00.000Z", open: 64840, high: 66250, low: 64510, close: 65980, volume: 1340, confirmed: true, source: "mock" },
  { time: 1778544000, timeISO: "2026-05-12T00:00:00.000Z", open: 65980, high: 67110, low: 65490, close: 66820, volume: 1425, confirmed: true, source: "mock" },
  { time: 1778630400, timeISO: "2026-05-13T00:00:00.000Z", open: 66820, high: 67680, low: 66140, close: 66480, volume: 1210, confirmed: true, source: "mock" },
  { time: 1778716800, timeISO: "2026-05-14T00:00:00.000Z", open: 66480, high: 68150, low: 66220, close: 67920, volume: 1550, confirmed: true, source: "mock" },
  { time: 1778803200, timeISO: "2026-05-15T00:00:00.000Z", open: 67920, high: 69040, low: 67480, close: 68420, volume: 1490, confirmed: true, source: "mock" }
];

export const mockMarket: MarketSnapshot = {
  symbol: "BTCUSDT",
  displayName: "BTC/USDT",
  price: 68420,
  changePercent: 1.8,
  trend: "up",
  updatedAt: "2026-05-15T12:00:00.000Z",
  candles: [
    { time: "05-10", open: 64200, high: 65120, low: 63680, close: 64840, volume: 1180 },
    { time: "05-11", open: 64840, high: 66250, low: 64510, close: 65980, volume: 1340 },
    { time: "05-12", open: 65980, high: 67110, low: 65490, close: 66820, volume: 1425 },
    { time: "05-13", open: 66820, high: 67680, low: 66140, close: 66480, volume: 1210 },
    { time: "05-14", open: 66480, high: 68150, low: 66220, close: 67920, volume: 1550 },
    { time: "05-15", open: 67920, high: 69040, low: 67480, close: 68420, volume: 1490 }
  ],
  klines: mockKlines,
  annotations: mockChartAnnotations,
  indicators: []
};

export const mockTradeSignal: TradeSignal = {
  id: "signal_mock_001",
  tradingSystemId: mockTradingSystem.id,
  symbol: "BTCUSDT",
  timeframe: "4H",
  direction: "long",
  light: "green",
  title: "4H 上行趋势回调确认",
  trigger: "价格回到计划区，未跌破结构低点，等待确认信号。",
  rationale: [
    "4H 主趋势仍为上行结构。",
    "价格回踩计划区后没有跌破结构低点。",
    "若无确认信号，则只观察不执行。"
  ],
  relatedRuleIds: ["rule_trend_001", "rule_risk_001", "rule_confirm_001"],
  annotations: mockChartAnnotations,
  detectedAt: "2026-05-15T11:55:00.000Z",
  userConfirmationRequired: true
};

export const mockTradePlan: TradePlan = {
  id: "plan_mock_001",
  signalId: mockTradeSignal.id,
  symbol: "BTCUSDT",
  timeframe: "4H",
  direction: "long",
  planStatus: "draft",
  confirmationStatus: "pending",
  light: "green",
  entryZone: "67500 - 67700",
  entryPrice: 67600,
  stopLossPrice: 66400,
  takeProfitPrice: 70400,
  invalidationCondition: "4H 收盘跌破 66400，计划失效并停止寻找多头执行。",
  riskRewardRatio: 2.33,
  riskPercent: 1,
  positionSizingNote: "按账户单笔 1% 风险计算仓位，用户最终确认后才可执行。",
  executionChecklist: [
    "价格必须回到入场区，不追价。",
    "入场前再次确认止损价和单笔风险。",
    "确认没有触发冷静期和每日交易次数限制。"
  ],
  reviewFocus: ["是否等待确认信号", "是否按计划止损", "是否存在追单冲动"],
  rationale: [
    "4H 主趋势仍为上行结构。",
    "价格回踩计划区后没有跌破结构低点。",
    "风险收益比大于 1:2，符合 MVP 体系要求。"
  ],
  userConfirmationRequired: true,
  createdAt: "2026-05-15T12:00:00.000Z"
};

export const mockReview: ReviewReport = {
  id: "review_mock_001",
  signalId: mockTradeSignal.id,
  planId: mockTradePlan.id,
  light: "green",
  summary: "该 mock 计划符合当前交易体系，可以生成计划草案，但必须由用户最终确认。",
  canGenerateExecutionPlan: true,
  finalConfirmationRequired: true,
  reviewedAt: "2026-05-15T12:00:00.000Z",
  reviewTasks: [
    "等待价格回到计划区并出现确认信号。",
    "执行前再次检查单笔风险是否不超过 1%。",
    "交易结束后记录计划执行偏差。"
  ],
  findings: [
    {
      id: "finding_trend_001",
      level: "pass",
      title: "趋势方向一致",
      message: "计划方向与 4H 上行趋势一致。",
      ruleId: "rule_trend_001"
    },
    {
      id: "finding_risk_001",
      level: "pass",
      title: "风险规则通过",
      message: "单笔风险按 1% 计算，没有扩大止损。",
      ruleId: "rule_risk_001"
    },
    {
      id: "finding_confirm_001",
      level: "warning",
      title: "等待入场确认",
      message: "如果价格没有回到计划区并出现确认信号，不应执行。",
      ruleId: "rule_confirm_001"
    }
  ]
};

export const mockBlockedReview: ReviewReport = {
  id: "review_blocked_mock_001",
  light: "red",
  summary: "该想法触发核心禁止规则，不能生成执行计划。",
  canGenerateExecutionPlan: false,
  finalConfirmationRequired: false,
  reviewedAt: "2026-05-15T12:05:00.000Z",
  reviewTasks: ["暂停交易，先记录触发红灯的原因。", "复盘是否存在追单、报复性交易或扩大止损冲动。"],
  findings: [
    {
      id: "finding_block_chase_001",
      level: "block",
      title: "触发红灯规则",
      message: "交易想法包含追单、报复性交易或临时扩大止损倾向，系统必须阻止执行计划。",
      ruleId: "ban_chase_001"
    }
  ]
};

export const mockTradeRecords: TradeRecord[] = [
  {
    id: "record_mock_001",
    planId: "plan_history_001",
    symbol: "BTCUSDT",
    direction: "long",
    status: "reviewed",
    plannedEntryPrice: 65200,
    actualEntryPrice: 65240,
    plannedStopLossPrice: 64200,
    exitPrice: 64400,
    resultR: -0.84,
    followedPlan: true,
    mistakeTags: ["计划内亏损"],
    reviewReportId: "review_history_001",
    notes: "计划内亏损，止损执行正常，没有扩大止损。",
    openedAt: "2026-05-10T08:00:00.000Z",
    closedAt: "2026-05-10T16:00:00.000Z"
  },
  {
    id: "record_mock_002",
    planId: "plan_history_002",
    symbol: "ETHUSDT",
    direction: "long",
    status: "closed",
    plannedEntryPrice: 3180,
    actualEntryPrice: 3182,
    plannedStopLossPrice: 3120,
    exitPrice: 3278,
    resultR: 1.6,
    followedPlan: true,
    mistakeTags: ["遵守计划"],
    notes: "计划内盈利，等待回调确认后入场。",
    openedAt: "2026-05-12T04:00:00.000Z",
    closedAt: "2026-05-13T00:00:00.000Z"
  },
  {
    id: "record_mock_003",
    planId: "plan_history_003",
    symbol: "SOLUSDT",
    direction: "flat",
    status: "cancelled",
    plannedEntryPrice: 148,
    plannedStopLossPrice: 143,
    followedPlan: true,
    mistakeTags: ["未追单"],
    notes: "价格未回到计划区，未追单，取消计划。",
    openedAt: "2026-05-14T08:00:00.000Z"
  }
];

export const mockBacktestResult: BacktestResult = {
  id: "backtest_mock_001",
  strategyName: "趋势回调 mock 策略",
  tradingSystemId: mockTradingSystem.id,
  symbol: "BTCUSDT",
  timeframe: "4H",
  period: {
    from: "2026-03-01",
    to: "2026-05-15"
  },
  sampleSize: 42,
  tradeCount: 42,
  winRatePercent: 48,
  totalReturnPercent: 8.6,
  averageRiskRewardRatio: 1.9,
  maxDrawdownR: 4.2,
  maxDrawdownPercent: 6.4,
  maxConsecutiveLosses: 3,
  totalReturnR: 7.4,
  aiSummary: "mock 回测显示该体系在样本中更依赖纪律执行和风险收益比，不代表未来收益。",
  summary: "mock 回测显示该体系在样本中更依赖纪律执行和风险收益比，不代表未来收益。",
  limitations: ["数据为 mock，仅用于前端展示。", "不接真实行情，不构成交易建议或盈利承诺。"]
};

export const mockRuleSuggestions: RuleSuggestion[] = [
  {
    id: "rule_suggestion_mock_001",
    source: "review",
    status: "pending",
    title: "连续亏损后降低交易频率",
    description: "最近记录显示亏损后容易急于找下一笔机会，建议把冷静期写入执行规则。",
    proposedRule: {
      id: "rule_after_loss_slowdown",
      title: "连续 2 笔亏损后只观察 4 小时",
      description: "连续 2 笔亏损后，系统只允许观察和复盘，4 小时内不生成新的执行计划。",
      category: "discipline",
      severity: "warning",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    relatedId: "record_mock_001",
    createdAt: "2026-05-15T12:20:00.000Z"
  }
];

export const mockAiSuggestions: AiSuggestion[] = [
  {
    id: "ai_suggestion_mock_001",
    source: "system",
    priority: "high",
    title: "先确认止损，再讨论入场",
    message: "当前体系把止损作为硬条件。任何没有明确止损和失效条件的想法，都应先补充信息。",
    resolved: false,
    createdAt: "2026-05-15T12:10:00.000Z"
  },
  {
    id: "ai_suggestion_mock_002",
    source: "backtest",
    priority: "medium",
    title: "MA30 更适合做趋势过滤",
    message: "mock 回测显示 MA30 在震荡区间容易连续亏损，建议把它作为过滤器，而不是唯一入场规则。",
    relatedId: "backtest_mock_001",
    resolved: false,
    createdAt: "2026-05-15T12:15:00.000Z"
  }
];

export const mockPeriodReports: PeriodReport[] = [
  {
    id: "period_report_daily_mock_001",
    type: "daily",
    period: {
      from: "2026-05-15",
      to: "2026-05-15"
    },
    tradeCount: 1,
    redLightCount: 1,
    repeatedMistakes: ["想逆势做空上涨趋势", "没有先确认止损"],
    nextActions: ["只记录符合体系的想法", "红灯后先复盘，不继续找机会"],
    aiSummary: "今日重点是纪律优先：红灯状态下不生成执行计划，先把冲动记录下来。"
  },
  {
    id: "period_report_weekly_mock_001",
    type: "weekly",
    period: {
      from: "2026-05-11",
      to: "2026-05-15"
    },
    tradeCount: 3,
    redLightCount: 2,
    repeatedMistakes: ["追单冲动", "止损后想立刻开仓"],
    nextActions: ["保留冷静期规则", "复盘每一次未追单的正确执行"],
    aiSummary: "本周 mock 记录显示，体系真正的优势来自少做错误交易，而不是频繁寻找机会。"
  }
];

export const mockMessages: AssistantMessage[] = [
  {
    id: "msg_001",
    role: "user",
    content: "BTC 回调到计划区附近，能不能做一笔多单？",
    createdAt: "2026-05-15T11:58:00.000Z"
  },
  {
    id: "msg_002",
    role: "assistant",
    content:
      "按当前 mock 交易体系，只有价格回到计划区并出现确认信号时，才允许生成计划草案。任何执行都需要你最终确认。",
    createdAt: "2026-05-15T11:59:00.000Z"
  }
];

export const mockWorkbenchData: WorkbenchData = {
  profile: mockUserProfile,
  tradingSystem: mockTradingSystem,
  market: mockMarket,
  tradeSignal: mockTradeSignal,
  signalDefinitions: mockSignalDefinitions,
  currentPlan: mockTradePlan,
  review: mockReview,
  tradeRecords: mockTradeRecords,
  reviewReports: [mockReview],
  backtestResult: mockBacktestResult,
  ruleSuggestions: mockRuleSuggestions,
  aiSuggestions: mockAiSuggestions,
  periodReports: mockPeriodReports,
  messages: mockMessages
};
