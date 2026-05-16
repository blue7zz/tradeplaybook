/** 纪律信号灯：绿灯可生成计划草案，黄灯需要补充确认，红灯必须阻止执行计划。 */
export type SignalLight = "green" | "yellow" | "red";

/** 兼容旧命名，后续业务代码优先使用 SignalLight。 */
export type RiskLight = SignalLight;

/** 交易方向。flat 表示当前只观察、不建立方向性计划。 */
export type TradeDirection = "long" | "short" | "flat";

/** 规则类型，用来区分入场、风控、纪律、复盘等规则来源。 */
export type RuleCategory =
  | "entry"
  | "exit"
  | "risk"
  | "discipline"
  | "review"
  | "forbidden";

/** 规则强度。core 代表核心硬约束，不能被临时绕过。 */
export type RuleSeverity = "core" | "warning" | "info";

/** 规则启用状态。MVP 阶段先保留简单状态。 */
export type RuleStatus = "active" | "inactive";

/** 计划生命周期。blocked 状态不能生成执行计划。 */
export type TradePlanStatus =
  | "draft"
  | "blocked"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "reviewed";

/** 成交记录状态，用于区分计划、执行和复盘阶段。 */
export type TradeRecordStatus = "planned" | "executed" | "closed" | "reviewed" | "cancelled";

/** 审核发现等级。block 会触发红灯阻止执行计划。 */
export type ReviewFindingLevel = "pass" | "warning" | "block";

/** 图表标注类型，用于在 K 线图上展示计划和复盘关键点。 */
export type ChartAnnotationType =
  | "entry"
  | "stop"
  | "target"
  | "invalid"
  | "signal"
  | "review"
  | "note"
  | "actualEntry"
  | "actualExit"
  | "error"
  | "drawdown"
  | "backtestBuy"
  | "backtestSell"
  | "backtestWin"
  | "backtestLoss";

/** 计划确认状态，所有真实执行都必须由用户最终确认。 */
export type UserConfirmationStatus = "pending" | "confirmed" | "rejected";

/** 规则建议状态。draft/pending 不会直接改变用户交易体系。 */
export type RuleSuggestionStatus = "draft" | "pending" | "accepted" | "rejected";

/** AI 建议来源，用于区分计划、回测、复盘和纪律提醒。 */
export type AiSuggestionSource = "plan" | "backtest" | "review" | "risk" | "system";

/** 周期报告类型。 */
export type PeriodReportType = "daily" | "weekly" | "monthly";

/** 支持的真实行情交易对。 */
export type SupportedInstrumentId = "BTC-USDT" | "ETH-USDT";

/** 支持的 K 线周期。 */
export type SupportedKlineBar = "15m" | "1H" | "4H";

/** 行情数据来源。 */
export type MarketDataSource = "mock" | "okx";

/** 图表标注动作类型，供 AI action 与图表统一使用。 */
export type ChartActionKind =
  | "entryZone"
  | "stopLossLine"
  | "takeProfitLine"
  | "invalidationLine"
  | "supportZone"
  | "resistanceZone"
  | "buyMarker"
  | "sellMarker"
  | "reviewMarker";

/** AI action 白名单。AI 只能返回这些动作，系统决定是否应用。 */
export type AiActionType =
  | "MARK_CHART"
  | "CREATE_TRADE_PLAN"
  | "REJECT_TRADE_PLAN"
  | "RUN_BACKTEST"
  | "SUGGEST_RULE"
  | "GENERATE_REVIEW";

/** 图表指标线上的一个点，MVP 阶段用于展示 mock 均线。 */
export interface ChartIndicatorPoint {
  /** 对应 K 线时间标签或 ISO 时间。 */
  time: string;
  /** 指标数值。 */
  value: number;
}

/** 图表指标线，例如 MA30。 */
export interface ChartIndicator {
  /** 指标唯一标识。 */
  id: string;
  /** 指标名称。 */
  label: string;
  /** 指标类型。 */
  type: "movingAverage";
  /** 指标周期，例如 30。 */
  period: number;
  /** 指标线点位。 */
  points: ChartIndicatorPoint[];
}

/** 基础用户信息，MVP 仅用于工作台展示。 */
export interface UserProfile {
  /** 用户唯一标识。 */
  id: string;
  /** 页面展示名称。 */
  displayName: string;
  /** 用户当前交易风格摘要。 */
  tradingStyle: string;
  /** 风险偏好或纪律模式摘要。 */
  riskMode: string;
}

/** 用户仓位管理规则，MVP 只用于计划说明，不做真实下单。 */
export interface PositionSizingRule {
  /** 仓位规则唯一标识。 */
  id: string;
  /** 规则名称。 */
  title: string;
  /** 单笔账户风险百分比。 */
  riskPerTradePercent: number;
  /** 单日账户风险百分比上限。 */
  maxDailyLossPercent: number;
  /** 连续亏损后的仓位调整说明。 */
  afterLossAdjustment: string;
  /** 仓位计算备注，必须强调用户最终确认。 */
  note: string;
}

/** 用户定义或 AI 帮用户沉淀的交易信号。 */
export interface SignalDefinition {
  /** 信号唯一标识。 */
  id: string;
  /** 所属交易体系 id。 */
  tradingSystemId: string;
  /** 信号名称。 */
  name: string;
  /** 信号适用方向。 */
  direction: TradeDirection;
  /** 信号适用周期。 */
  timeframe: string;
  /** 触发条件，使用自然语言描述。 */
  triggerConditions: string[];
  /** 信号失效条件。 */
  invalidationConditions: string[];
  /** 是否必须等待收盘或结构确认。 */
  confirmationRequired: boolean;
  /** 图表展示颜色或标签，MVP 仅用于 UI。 */
  displayLabel: string;
}

/** 用户个人交易体系中的一条规则。 */
export interface TradingRule {
  /** 规则唯一标识。 */
  id: string;
  /** 规则标题，用于列表和审核结果展示。 */
  title: string;
  /** 规则描述，说明规则触发条件和约束含义。 */
  description: string;
  /** 规则所属分类。 */
  category: RuleCategory;
  /** 规则强度，core 规则不能被临时绕过。 */
  severity: RuleSeverity;
  /** 当前是否启用。 */
  status: RuleStatus;
  /** 是否允许用户在非当前交易中修改；核心禁止规则通常为 false。 */
  canBeTemporarilyBypassed: boolean;
}

/** 用户已经确认的个人交易体系，是 AI 审核信号和计划的依据。 */
export interface UserTradingSystem {
  /** 体系唯一标识。 */
  id: string;
  /** 所属用户标识。 */
  userId: string;
  /** 体系名称。 */
  name: string;
  /** 体系版本，便于后续复盘和规则演进。 */
  version: string;
  /** 主要市场范围，例如 BTC/USDT 或加密货币主流币。 */
  marketScope: string;
  /** 当前体系允许观察和计划的周期。 */
  timeframes: string[];
  /** 用户交易风格，例如趋势回调、突破回踩。 */
  tradingStyle: string;
  /** 单笔最大风险百分比。 */
  maxRiskPerTradePercent: number;
  /** 单日最大亏损百分比。 */
  maxDailyLossPercent: number;
  /** 每日最多交易次数，超过后不再生成新计划。 */
  maxDailyTradeCount: number;
  /** 用户自己识别出的常犯错误，用于生成禁止规则和复盘任务。 */
  commonMistakes: string[];
  /** 用户偏好的交易信号，用于生成初始入场规则。 */
  preferredSignals: string[];
  /** 仓位管理规则。 */
  positionSizingRule?: PositionSizingRule;
  /** 用户已定义的信号模板。 */
  signalDefinitions?: SignalDefinition[];
  /** 正向执行规则。 */
  rules: TradingRule[];
  /** 核心禁止规则，触发后必须进入红灯。 */
  forbiddenRules: TradingRule[];
  /** 是否所有执行计划都需要用户最终确认。 */
  userFinalConfirmationRequired: boolean;
  /** 最近更新时间，ISO 字符串。 */
  updatedAt: string;
}

/** 兼容旧命名，后续业务代码优先使用 UserTradingSystem。 */
export type TradingSystem = UserTradingSystem;

/** K 线数据，第一版来自 mock。 */
export interface Candle {
  /** K 线时间标签或 ISO 时间。 */
  time: string;
  /** 开盘价。 */
  open: number;
  /** 最高价。 */
  high: number;
  /** 最低价。 */
  low: number;
  /** 收盘价。 */
  close: number;
  /** 成交量，mock 阶段仅用于展示。 */
  volume: number;
}

/** 项目内部统一 K 线。OKX 原始响应必须先转换为此类型，不能进入 UI 组件。 */
export interface Kline {
  /** 秒级 Unix 时间戳，图表库使用。 */
  time: number;
  /** ISO 时间字符串。 */
  timeISO: string;
  /** 开盘价。 */
  open: number;
  /** 最高价。 */
  high: number;
  /** 最低价。 */
  low: number;
  /** 收盘价。 */
  close: number;
  /** 成交量。 */
  volume: number;
  /** 是否为已确认 K 线；回测只允许使用 true。 */
  confirmed: boolean;
  /** 数据来源。 */
  source: MarketDataSource;
}

/** 图表上的交易计划、信号、止损、止盈或复盘标注。 */
export interface ChartAnnotation {
  /** 标注唯一标识。 */
  id: string;
  /** 所属交易标的。 */
  symbol: string;
  /** 标注时间标签或 ISO 时间。 */
  time: string;
  /** 标注价格。 */
  price: number;
  /** 图表上展示的短标签。 */
  label: string;
  /** 标注类型。 */
  type: ChartAnnotationType;
  /** 可选说明，用于详情面板。 */
  note?: string;
  /** 可选关联计划、信号或交易记录 id。 */
  relatedId?: string;
}

/** 前端图表区域的市场快照，第一版只承载 mock K 线和标注。 */
export interface MarketSnapshot {
  /** 交易标的代码。 */
  symbol: string;
  /** 交易标的展示名称。 */
  displayName: string;
  /** 当前 mock 价格。 */
  price: number;
  /** 当前 mock 涨跌幅。 */
  changePercent: number;
  /** 趋势状态。 */
  trend: "up" | "down" | "range";
  /** K 线数据。 */
  candles: Candle[];
  /** 内部统一 K 线；真实图表优先使用这个字段。 */
  klines?: Kline[];
  /** 图表标注。 */
  annotations: ChartAnnotation[];
  /** 图表指标线，第一版用于 mock MA30。 */
  indicators?: ChartIndicator[];
  /** 数据更新时间，ISO 字符串。 */
  updatedAt: string;
}

/** 行情 API 返回体。 */
export interface MarketCandlesResponse {
  /** 交易对。 */
  instId: SupportedInstrumentId;
  /** K 线周期。 */
  bar: SupportedKlineBar;
  /** 数据来源。 */
  source: MarketDataSource;
  /** 内部统一 K 线。 */
  klines: Kline[];
  /** 是否使用了 mock fallback。 */
  fallback: boolean;
  /** 可展示错误信息。 */
  error?: string;
  /** 生成时间，ISO 字符串。 */
  generatedAt: string;
}

/** 历史 K 线 API 返回体。 */
export interface MarketHistoryCandlesResponse extends MarketCandlesResponse {
  /** 查询天数。 */
  days: number;
  /** 是否已经只保留确认 K 线。 */
  confirmedOnly: boolean;
}

/** AI 按用户交易体系识别出的交易信号。 */
export interface TradeSignal {
  /** 信号唯一标识。 */
  id: string;
  /** 关联用户交易体系 id。 */
  tradingSystemId: string;
  /** 交易标的。 */
  symbol: string;
  /** 信号周期。 */
  timeframe: string;
  /** 信号方向。 */
  direction: TradeDirection;
  /** 信号灯状态，红灯不能生成执行计划。 */
  light: SignalLight;
  /** 信号标题。 */
  title: string;
  /** 信号触发条件描述。 */
  trigger: string;
  /** AI 给出的信号依据。 */
  rationale: string[];
  /** 关联命中的规则 id。 */
  relatedRuleIds: string[];
  /** 信号相关图表标注。 */
  annotations: ChartAnnotation[];
  /** 信号发现时间，ISO 字符串。 */
  detectedAt: string;
  /** 是否需要用户确认后才能进入计划。 */
  userConfirmationRequired: boolean;
}

/** AI 生成的交易计划草案；只有不违反体系时才允许生成。 */
export interface TradePlan {
  /** 计划唯一标识。 */
  id: string;
  /** 可选关联信号 id。 */
  signalId?: string;
  /** 交易标的。 */
  symbol: string;
  /** 计划周期。 */
  timeframe: string;
  /** 计划方向。 */
  direction: TradeDirection;
  /** 计划状态。 */
  planStatus: TradePlanStatus;
  /** 用户确认状态。真实执行前必须为 confirmed。 */
  confirmationStatus?: UserConfirmationStatus;
  /** 计划纪律灯。 */
  light: SignalLight;
  /** 入场区间，MVP 使用文本展示。 */
  entryZone?: string;
  /** 计划入场价。 */
  entryPrice: number;
  /** 计划止损价。 */
  stopLossPrice: number;
  /** 计划止盈价。 */
  takeProfitPrice: number;
  /** 计划失效条件。 */
  invalidationCondition: string;
  /** 风险收益比。 */
  riskRewardRatio: number;
  /** 本计划账户风险百分比。 */
  riskPercent: number;
  /** 仓位计算说明，MVP 不做真实下单。 */
  positionSizingNote: string;
  /** 执行前检查项。 */
  executionChecklist?: string[];
  /** 交易结束后重点复盘项。 */
  reviewFocus?: string[];
  /** 计划依据。 */
  rationale: string[];
  /** 红灯或阻止计划时的原因。 */
  blockedReason?: string;
  /** 是否必须用户最终确认。 */
  userConfirmationRequired: boolean;
  /** 创建时间，ISO 字符串。 */
  createdAt: string;
}

/** 用户计划和实际执行之间的交易记录，用于复盘。 */
export interface TradeRecord {
  /** 交易记录唯一标识。 */
  id: string;
  /** 关联计划 id。 */
  planId: string;
  /** 交易标的。 */
  symbol: string;
  /** 交易方向。 */
  direction: TradeDirection;
  /** 记录状态。 */
  status: TradeRecordStatus;
  /** 计划入场价。 */
  plannedEntryPrice: number;
  /** 实际入场价，可为空表示未执行。 */
  actualEntryPrice?: number;
  /** 计划止损价。 */
  plannedStopLossPrice: number;
  /** 实际出场价。 */
  exitPrice?: number;
  /** R 倍数结果，用于复盘。 */
  resultR?: number;
  /** 是否完全按计划执行。 */
  followedPlan: boolean;
  /** 复盘标签，例如追单、提前离场。 */
  mistakeTags?: string[];
  /** 关联复盘报告 id。 */
  reviewReportId?: string;
  /** 用户记录的执行备注。 */
  notes: string;
  /** 开仓或计划创建时间，ISO 字符串。 */
  openedAt: string;
  /** 平仓时间，ISO 字符串。 */
  closedAt?: string;
}

/** 审核发现项，说明计划通过、警告或阻止的原因。 */
export interface ReviewFinding {
  /** 发现项唯一标识。 */
  id: string;
  /** 发现项等级。 */
  level: ReviewFindingLevel;
  /** 发现项标题。 */
  title: string;
  /** 面向用户的解释。 */
  message: string;
  /** 关联规则 id。 */
  ruleId?: string;
}

/** AI 根据复盘或回测提出的规则更新建议。 */
export interface RuleSuggestion {
  /** 建议唯一标识。 */
  id: string;
  /** 建议来源。 */
  source: AiSuggestionSource;
  /** 建议状态，accepted 后才会写入规则库。 */
  status: RuleSuggestionStatus;
  /** 建议标题。 */
  title: string;
  /** 建议说明。 */
  description: string;
  /** 建议新增或修改的规则草案。 */
  proposedRule: TradingRule;
  /** 关联复盘、回测或计划 id。 */
  relatedId?: string;
  /** 创建时间，ISO 字符串。 */
  createdAt: string;
}

/** AI 给用户的工作台建议，不会自动改变交易体系。 */
export interface AiSuggestion {
  /** 建议唯一标识。 */
  id: string;
  /** 建议来源。 */
  source: AiSuggestionSource;
  /** 重要程度。 */
  priority: "low" | "medium" | "high";
  /** 建议标题。 */
  title: string;
  /** 建议正文。 */
  message: string;
  /** 可选关联对象 id。 */
  relatedId?: string;
  /** 是否已处理。 */
  resolved: boolean;
  /** 创建时间，ISO 字符串。 */
  createdAt: string;
}

/** AI 对信号或计划的纪律审核报告。 */
export interface ReviewReport {
  /** 报告唯一标识。 */
  id: string;
  /** 可选关联信号 id。 */
  signalId?: string;
  /** 可选关联计划 id。 */
  planId?: string;
  /** 可选关联交易记录 id。 */
  recordId?: string;
  /** 审核后的信号灯。 */
  light: SignalLight;
  /** 审核摘要。 */
  summary: string;
  /** 详细审核发现。 */
  findings: ReviewFinding[];
  /** 是否允许生成执行计划。红灯时必须为 false。 */
  canGenerateExecutionPlan: boolean;
  /** 是否仍需用户最终确认。 */
  finalConfirmationRequired: boolean;
  /** 给用户的复盘或补充任务。 */
  reviewTasks: string[];
  /** 复盘中的图表标注。 */
  annotations?: ChartAnnotation[];
  /** AI 复盘后的改进建议。 */
  improvementSuggestions?: string[];
  /** AI 提出的规则建议，需用户确认后才进入规则库。 */
  ruleSuggestions?: RuleSuggestion[];
  /** 审核时间，ISO 字符串。 */
  reviewedAt: string;
}

/** 兼容旧命名，后续业务代码优先使用 ReviewReport。 */
export type PlanReview = ReviewReport;

/** 回测结果摘要。MVP 阶段只使用 mock，不能表达盈利承诺。 */
export interface BacktestResult {
  /** 回测结果唯一标识。 */
  id: string;
  /** 策略名称。 */
  strategyName: string;
  /** 关联交易体系 id。 */
  tradingSystemId: string;
  /** 回测标的。 */
  symbol: string;
  /** 回测周期。 */
  timeframe: string;
  /** 回测时间范围。 */
  period: {
    /** 开始时间，ISO 字符串或日期。 */
    from: string;
    /** 结束时间，ISO 字符串或日期。 */
    to: string;
  };
  /** 样本交易数量。 */
  sampleSize: number;
  /** 交易次数。 */
  tradeCount: number;
  /** 计划内胜率百分比。 */
  winRatePercent: number;
  /** 总收益百分比。mock 阶段不代表真实收益。 */
  totalReturnPercent: number;
  /** 平均风险收益比。 */
  averageRiskRewardRatio: number;
  /** 最大回撤，按 R 倍数记录。 */
  maxDrawdownR: number;
  /** 最大回撤百分比。 */
  maxDrawdownPercent: number;
  /** 连续亏损次数。 */
  maxConsecutiveLosses: number;
  /** 平均盈利百分比。 */
  averageWinPercent?: number;
  /** 平均亏损百分比。 */
  averageLossPercent?: number;
  /** 总结果，按 R 倍数记录。 */
  totalReturnR: number;
  /** AI 总结。 */
  aiSummary: string;
  /** 回测图表标注。 */
  annotations?: ChartAnnotation[];
  /** 回测 MA 指标线。 */
  indicators?: ChartIndicator[];
  /** 回测结论摘要。 */
  summary: string;
  /** 需要注意的限制，不得承诺盈利。 */
  limitations: string[];
}

/** 图表标注 action 载荷。 */
export interface ChartMarkPayload {
  /** 标注类型。 */
  kind: ChartActionKind;
  /** 交易标的。 */
  symbol: string;
  /** 标注时间，秒级时间戳或 ISO。 */
  time: number | string;
  /** 可选结束时间，用于区间类标注。 */
  endTime?: number | string;
  /** 价格。 */
  price: number;
  /** 可选结束价格，用于区间类标注。 */
  endPrice?: number;
  /** 标签。 */
  label: string;
  /** 说明。 */
  note?: string;
}

/** AI 返回的结构化动作。 */
export interface AiAction {
  /** 动作类型。 */
  type: AiActionType;
  /** 图表标注动作。 */
  mark?: ChartMarkPayload;
  /** 交易计划草案。红灯时系统必须拒绝应用。 */
  tradePlan?: TradePlan;
  /** 拒绝原因。 */
  rejectionReason?: string;
  /** 回测请求。 */
  backtestRequest?: {
    /** 策略名称。 */
    strategyName: "MA30";
    /** 交易对。 */
    instId: SupportedInstrumentId;
    /** K 线周期。 */
    bar: SupportedKlineBar;
    /** 回测天数。 */
    days: number;
  };
  /** 规则建议。 */
  ruleSuggestion?: RuleSuggestion;
  /** 复盘报告。 */
  reviewReport?: ReviewReport;
}

/** AI 结构化响应。 */
export interface AiResponse {
  /** 给用户看的自然语言回复。 */
  message: string;
  /** 信号灯。 */
  signalLight?: SignalLight;
  /** 命中的规则。 */
  triggeredRules?: TradingRule[];
  /** 系统可选择应用的动作。 */
  actions: AiAction[];
}

/** AI 对话 API 请求。 */
export interface AiChatRequest {
  /** 用户输入。 */
  message: string;
  /** 当前工作台上下文。 */
  context: {
    /** 用户交易体系。 */
    tradingSystem: UserTradingSystem;
    /** 当前市场。 */
    market: MarketSnapshot;
    /** 当前计划。 */
    currentPlan: TradePlan | null;
  };
}

/** AI 对话 API 响应。 */
export interface AiChatResponse {
  /** AI 结构化响应。 */
  ai: AiResponse;
  /** 响应来源。 */
  source: "ai" | "mock-fallback";
  /** 可选错误信息。 */
  error?: string;
  /** 生成时间。 */
  generatedAt: string;
}

/** 日报、周报或月报，MVP 阶段由 mock 交易记录生成摘要。 */
export interface PeriodReport {
  /** 报告唯一标识。 */
  id: string;
  /** 报告类型。 */
  type: PeriodReportType;
  /** 报告覆盖周期。 */
  period: {
    /** 开始日期。 */
    from: string;
    /** 结束日期。 */
    to: string;
  };
  /** 交易次数。 */
  tradeCount: number;
  /** 红灯触发次数。 */
  redLightCount: number;
  /** 最常出现的问题。 */
  repeatedMistakes: string[];
  /** 下一阶段行动项。 */
  nextActions: string[];
  /** AI 总结。 */
  aiSummary: string;
}

/** 右侧 AI 对话消息。 */
export interface AssistantMessage {
  /** 消息唯一标识。 */
  id: string;
  /** 消息角色。 */
  role: "user" | "assistant";
  /** 消息内容。 */
  content: string;
  /** 创建时间，ISO 字符串。 */
  createdAt: string;
}

/** 前端首页工作台需要的一组 mock 数据。 */
export interface WorkbenchData {
  /** 当前用户展示信息。 */
  profile: UserProfile;
  /** 用户个人交易体系。 */
  tradingSystem: UserTradingSystem;
  /** 当前市场快照。 */
  market: MarketSnapshot;
  /** 当前交易信号。 */
  tradeSignal: TradeSignal;
  /** 用户交易体系里的信号定义。 */
  signalDefinitions: SignalDefinition[];
  /** 当前计划草案；红灯审核时为空，表示禁止生成执行计划。 */
  currentPlan: TradePlan | null;
  /** 当前审核报告。 */
  review: ReviewReport;
  /** 交易历史记录。 */
  tradeRecords: TradeRecord[];
  /** 已生成的复盘报告。 */
  reviewReports: ReviewReport[];
  /** 当前体系 mock 回测结果。 */
  backtestResult: BacktestResult;
  /** 待用户确认的规则建议。 */
  ruleSuggestions: RuleSuggestion[];
  /** AI 建议列表。 */
  aiSuggestions: AiSuggestion[];
  /** 周期报告列表。 */
  periodReports: PeriodReport[];
  /** 右侧 AI 对话。 */
  messages: AssistantMessage[];
}

/** API 健康检查响应。 */
export interface ApiHealthResponse {
  /** 服务状态。 */
  status: "ok";
  /** 服务名。 */
  service: "tradeplaybook-api";
  /** 标识当前服务只使用 mock 数据。 */
  mock: true;
}

/** mock 计划审核请求。 */
export interface ReviewPlanRequest {
  /** 用户输入的交易想法。 */
  idea: string;
  /** 可选交易标的。 */
  symbol?: string;
}

/** mock 计划审核响应。 */
export interface ReviewPlanResponse {
  /** 审核报告。 */
  review: ReviewReport;
  /** 审核来源，MVP 固定为 mock 规则引擎。 */
  source: "mock-rule-engine";
  /** 生成时间，ISO 字符串。 */
  generatedAt: string;
}
