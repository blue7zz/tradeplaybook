import type {
  AiSuggestion,
  AssistantMessage,
  BacktestResult,
  ChartAnnotation,
  ChartIndicator,
  ReviewReport,
  RuleSuggestion,
  SignalLight,
  TradePlan,
  TradeRecord,
  WorkbenchData
} from "@tradeplaybook/shared";

export function handleWorkbenchIdea(data: WorkbenchData, idea: string): WorkbenchData {
  const createdAt = new Date().toISOString();
  const userMessage = createUserMessage(idea, createdAt);

  if (isRuleAcceptRequest(idea)) {
    const pendingSuggestion = data.ruleSuggestions.find((suggestion) => suggestion.status === "pending");

    if (!pendingSuggestion) {
      return appendAssistantMessage(
        data,
        userMessage,
        "当前没有待确认的规则建议。AI 不会自动修改你的交易体系。"
      );
    }

    return acceptRuleSuggestion(data, pendingSuggestion.id, userMessage);
  }

  if (isReviewRequest(idea)) {
    const record = data.tradeRecords.find((item) => item.status !== "reviewed") ?? data.tradeRecords[0];

    if (!record) {
      return appendAssistantMessage(data, userMessage, "还没有交易记录可以复盘。");
    }

    return generateReviewForRecord(data, record.id, userMessage);
  }

  if (isTradeRecordRequest(idea)) {
    return confirmCurrentPlan(data, userMessage);
  }

  if (isMa30BacktestRequest(idea)) {
    return runMa30Backtest(data, userMessage, createdAt);
  }

  if (idea.includes("做空") && data.market.trend === "up") {
    const review = createRedLightReview(createdAt);
    const assistantMessage = createAssistantMessage(
      "红灯：当前趋势上涨。\n用户交易体系禁止上涨趋势中逆势做空。\n不建议交易。\n禁止生成执行计划。",
      createdAt
    );

    return {
      ...data,
      currentPlan: null,
      review,
      aiSuggestions: [
        createAiSuggestion(
          "risk",
          "high",
          "红灯后先记录冲动",
          "这次想法违反顺势规则。建议只做记录和复盘，不继续寻找替代入场。",
          review.id,
          createdAt
        ),
        ...data.aiSuggestions
      ],
      market: {
        ...data.market,
        annotations: [],
        indicators: []
      },
      messages: [...data.messages, userMessage, assistantMessage]
    };
  }

  if (looksLikeTradeIdea(idea) && lacksExplicitStopLoss(idea)) {
    const review = createYellowLightReview(createdAt);
    const assistantMessage = createAssistantMessage(
      "黄灯：这个想法还缺少明确止损和计划失效条件。\n请先补充：入场区、止损价、止盈目标，以及什么情况下放弃交易。\n在信息补齐前，AI 只做观察，不生成执行计划。",
      createdAt
    );

    return {
      ...data,
      currentPlan: null,
      review,
      market: {
        ...data.market,
        annotations: [
          {
            id: `ann_yellow_${Date.now()}`,
            symbol: data.market.symbol,
            time: "当前",
            price: data.market.price,
            label: "等待补充",
            type: "note",
            note: "缺少明确止损，不生成执行计划。"
          }
        ],
        indicators: []
      },
      messages: [...data.messages, userMessage, assistantMessage]
    };
  }

  const plan = createMockPlan(data, idea, createdAt);
  const annotations = createPlanAnnotations(plan);
  const review = createGreenLightReview(plan, createdAt);
  const assistantMessage = createAssistantMessage(
    `绿灯：该想法没有触发当前 mock 交易体系的核心禁止规则。\n已生成 ${plan.symbol} ${plan.timeframe} 计划草案，入场 ${plan.entryPrice}，止损 ${plan.stopLossPrice}，止盈 ${plan.takeProfitPrice}。\n所有执行动作仍需要用户最终确认。`,
    createdAt
  );

  return {
    ...data,
    currentPlan: plan,
    review,
    aiSuggestions: [
      createAiSuggestion(
        "plan",
        "medium",
        "执行前只检查清单，不临场改规则",
        "计划草案已经生成。下一步应检查入场、止损、仓位和冷静期，而不是继续寻找更刺激的入场。",
        plan.id,
        createdAt
      ),
      ...data.aiSuggestions
    ],
    market: {
      ...data.market,
      annotations,
      indicators: []
    },
    messages: [...data.messages, userMessage, assistantMessage]
  };
}

export function confirmCurrentPlan(
  data: WorkbenchData,
  incomingUserMessage?: AssistantMessage
): WorkbenchData {
  const plan = data.currentPlan;
  const createdAt = new Date().toISOString();

  if (!plan || plan.light === "red" || plan.planStatus === "blocked") {
    const userMessage = incomingUserMessage ?? createUserMessage("确认当前计划", createdAt);
    return appendAssistantMessage(
      data,
      userMessage,
      "当前没有可确认的执行计划。红灯或空计划状态下，系统不会生成交易记录。"
    );
  }

  if (data.tradeRecords.some((record) => record.planId === plan.id)) {
    const userMessage = incomingUserMessage ?? createUserMessage("确认当前计划", createdAt);
    return appendAssistantMessage(data, userMessage, "这份计划已经生成过 mock 交易记录。");
  }

  const confirmedPlan: TradePlan = {
    ...plan,
    planStatus: "confirmed",
    confirmationStatus: "confirmed"
  };
  const record = createTradeRecordFromPlan(confirmedPlan, createdAt);
  const review = createExecutionRecordedReview(confirmedPlan, record, createdAt);
  const assistantMessage = createAssistantMessage(
    `已由用户确认计划，并生成一条 mock 交易记录。\n记录：${record.symbol} ${record.direction === "long" ? "做多" : "做空"}，结果 ${formatR(record.resultR)}。\n这只是前端 mock 记录，没有真实下单。`,
    createdAt
  );
  const messages = incomingUserMessage
    ? [...data.messages, incomingUserMessage, assistantMessage]
    : [...data.messages, assistantMessage];

  return {
    ...data,
    currentPlan: confirmedPlan,
    review,
    tradeRecords: [record, ...data.tradeRecords],
    market: {
      ...data.market,
      annotations: [
        ...createPlanAnnotations(confirmedPlan),
        {
          id: `ann_actual_entry_${record.id}`,
          symbol: record.symbol,
          time: "当前",
          price: record.actualEntryPrice ?? record.plannedEntryPrice,
          label: "实际入场",
          type: "actualEntry",
          relatedId: record.id
        },
        {
          id: `ann_actual_exit_${record.id}`,
          symbol: record.symbol,
          time: "当前",
          price: record.exitPrice ?? confirmedPlan.takeProfitPrice,
          label: "实际出场",
          type: "actualExit",
          relatedId: record.id
        }
      ],
      indicators: []
    },
    messages
  };
}

export function abandonCurrentPlan(data: WorkbenchData): WorkbenchData {
  const createdAt = new Date().toISOString();
  const review = createObservationReview(
    "已放弃当前计划。放弃计划不是错，避免不符合体系的执行也是交易体系的一部分。",
    createdAt
  );
  const assistantMessage = createAssistantMessage(
    "已放弃当前计划。系统不会保留执行计划，也不会生成交易记录。",
    createdAt
  );

  return {
    ...data,
    currentPlan: null,
    review,
    market: {
      ...data.market,
      annotations: [],
      indicators: []
    },
    messages: [...data.messages, assistantMessage]
  };
}

export function generateReviewForRecord(
  data: WorkbenchData,
  recordId: string,
  incomingUserMessage?: AssistantMessage
): WorkbenchData {
  const record = data.tradeRecords.find((item) => item.id === recordId);
  const createdAt = new Date().toISOString();

  if (!record) {
    const userMessage = incomingUserMessage ?? createUserMessage("复盘交易", createdAt);
    return appendAssistantMessage(data, userMessage, "没有找到这条交易记录，无法生成复盘报告。");
  }

  const report = createRecordReview(record, createdAt);
  const ruleSuggestions = mergeRuleSuggestions(data.ruleSuggestions, report.ruleSuggestions ?? []);
  const assistantMessage = createAssistantMessage(
    `已生成 mock 单笔复盘。\n结论：${report.summary}\n建议先处理复盘任务，再决定是否把规则建议写入规则库。`,
    createdAt
  );
  const messages = incomingUserMessage
    ? [...data.messages, incomingUserMessage, assistantMessage]
    : [...data.messages, assistantMessage];

  return {
    ...data,
    review: report,
    reviewReports: [report, ...data.reviewReports],
    ruleSuggestions,
    aiSuggestions: [
      createAiSuggestion(
        "review",
        record.followedPlan ? "medium" : "high",
        record.followedPlan ? "复盘计划内结果" : "优先修正执行偏差",
        record.followedPlan
          ? "这笔交易重点复盘体系是否有效，而不是因为单笔盈亏临时改规则。"
          : "这笔交易存在执行偏差，先沉淀禁止规则，再寻找下一笔机会。",
        report.id,
        createdAt
      ),
      ...data.aiSuggestions
    ],
    tradeRecords: data.tradeRecords.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: "reviewed",
            reviewReportId: report.id
          }
        : item
    ),
    market: {
      ...data.market,
      annotations: report.annotations ?? data.market.annotations,
      indicators: []
    },
    messages
  };
}

export function acceptRuleSuggestion(
  data: WorkbenchData,
  suggestionId: string,
  incomingUserMessage?: AssistantMessage
): WorkbenchData {
  const createdAt = new Date().toISOString();
  const suggestion = data.ruleSuggestions.find((item) => item.id === suggestionId);

  if (!suggestion) {
    const userMessage = incomingUserMessage ?? createUserMessage("接受规则建议", createdAt);
    return appendAssistantMessage(data, userMessage, "没有找到这条规则建议。");
  }

  if (suggestion.status === "accepted") {
    const userMessage = incomingUserMessage ?? createUserMessage("接受规则建议", createdAt);
    return appendAssistantMessage(data, userMessage, "这条规则建议已经写入规则库。");
  }

  const ruleExists = [...data.tradingSystem.rules, ...data.tradingSystem.forbiddenRules].some(
    (rule) => rule.id === suggestion.proposedRule.id
  );
  const nextRules = ruleExists
    ? data.tradingSystem.rules
    : [...data.tradingSystem.rules, suggestion.proposedRule];
  const assistantMessage = createAssistantMessage(
    `已在用户确认后写入规则库：${suggestion.proposedRule.title}。\n核心禁止规则仍不能被临时绕过。`,
    createdAt
  );
  const messages = incomingUserMessage
    ? [...data.messages, incomingUserMessage, assistantMessage]
    : [...data.messages, assistantMessage];

  return {
    ...data,
    tradingSystem: {
      ...data.tradingSystem,
      rules: nextRules,
      version: bumpPatchVersion(data.tradingSystem.version),
      updatedAt: createdAt
    },
    ruleSuggestions: data.ruleSuggestions.map((item) =>
      item.id === suggestion.id
        ? {
            ...item,
            status: "accepted"
          }
        : item
    ),
    aiSuggestions: [
      createAiSuggestion(
        "system",
        "medium",
        "规则库已更新",
        `规则「${suggestion.proposedRule.title}」已经进入交易体系，后续计划审核会把它作为纪律约束。`,
        suggestion.id,
        createdAt
      ),
      ...data.aiSuggestions
    ],
    messages
  };
}

function runMa30Backtest(
  data: WorkbenchData,
  userMessage: AssistantMessage,
  createdAt: string
): WorkbenchData {
  const backtestResult = createMa30BacktestResult(data, createdAt);
  const annotations = createMa30BacktestAnnotations(data.market.symbol);
  const indicators = createMa30Indicator();
  const review = createBacktestReview(backtestResult, createdAt);
  const assistantMessage = createAssistantMessage(
    `已识别 MA30 策略回测请求。\n策略：${backtestResult.strategyName}\n周期：${backtestResult.period.from} 至 ${backtestResult.period.to}\n交易次数 ${backtestResult.tradeCount} 次，胜率 ${backtestResult.winRatePercent}%，总收益 ${backtestResult.totalReturnPercent}%，最大回撤 ${backtestResult.maxDrawdownPercent}%。\n这是 mock 回测结果，不构成交易建议。`,
    createdAt
  );

  return {
    ...data,
    review,
    backtestResult,
    aiSuggestions: [
      createAiSuggestion(
        "backtest",
        "medium",
        "把 MA30 作为过滤器",
        "MA30 mock 回测显示趋势期更有效，震荡期易连亏。建议只把它作为趋势过滤器，不单独作为入场理由。",
        backtestResult.id,
        createdAt
      ),
      ...data.aiSuggestions
    ],
    market: {
      ...data.market,
      annotations,
      indicators
    },
    messages: [...data.messages, userMessage, assistantMessage]
  };
}

function isMa30BacktestRequest(idea: string) {
  const normalized = idea.replace(/\s/g, "").toLowerCase();

  return (
    (normalized.includes("30均线") || normalized.includes("ma30")) &&
    normalized.includes("回测")
  );
}

function isReviewRequest(idea: string) {
  return idea.includes("复盘") || idea.toLowerCase().includes("review");
}

function isTradeRecordRequest(idea: string) {
  return idea.includes("记录这笔") || idea.includes("生成交易记录") || idea.includes("已执行");
}

function isRuleAcceptRequest(idea: string) {
  return idea.includes("接受规则") || idea.includes("写入规则库") || idea.includes("采纳建议");
}

function looksLikeTradeIdea(idea: string) {
  return ["做多", "做空", "买入", "卖出", "开仓", "入场"].some((keyword) => idea.includes(keyword));
}

function lacksExplicitStopLoss(idea: string) {
  return !["止损", "失效", "跌破", "突破失败"].some((keyword) => idea.includes(keyword));
}

function createRedLightReview(reviewedAt: string): ReviewReport {
  return {
    id: `review_red_${Date.now()}`,
    light: "red",
    summary: "红灯：当前趋势上涨，体系禁止逆势做空，不建议交易，禁止生成执行计划。",
    canGenerateExecutionPlan: false,
    finalConfirmationRequired: false,
    reviewedAt,
    reviewTasks: ["记录本次逆势做空冲动。", "复盘是否违反顺势交易规则。"],
    findings: [
      {
        id: "finding_uptrend_short_001",
        level: "block",
        title: "当前趋势上涨",
        message: "当前 mock 行情趋势为上涨。"
      },
      {
        id: "finding_uptrend_short_002",
        level: "block",
        title: "违反交易体系",
        message: "用户交易体系禁止上涨趋势中逆势做空。"
      },
      {
        id: "finding_uptrend_short_003",
        level: "block",
        title: "禁止生成执行计划",
        message: "不建议交易，且红灯状态下不能生成执行计划。"
      }
    ]
  };
}

function createYellowLightReview(reviewedAt: string): ReviewReport {
  return {
    id: `review_yellow_${Date.now()}`,
    light: "yellow",
    summary: "黄灯：信息不足，缺少明确止损或失效条件，暂不生成执行计划。",
    canGenerateExecutionPlan: false,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: ["补充入场区、止损价、止盈目标。", "说明什么情况下放弃交易。"],
    findings: [
      {
        id: "finding_missing_stop_001",
        level: "warning",
        title: "缺少明确止损",
        message: "用户体系要求先定义止损，再讨论仓位和入场。"
      }
    ]
  };
}

function createGreenLightReview(plan: TradePlan, reviewedAt: string): ReviewReport {
  return {
    id: `review_green_${Date.now()}`,
    planId: plan.id,
    light: "green",
    summary: "绿灯：该想法符合当前 mock 交易体系，可以生成计划草案，但必须由用户最终确认。",
    canGenerateExecutionPlan: true,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: ["执行前再次确认入场、止损和止盈。", "交易结束后记录实际执行是否偏离计划。"],
    findings: [
      {
        id: "finding_demo_trend_pass",
        level: "pass",
        title: "未触发逆势做空",
        message: "交易想法没有违反上涨趋势中禁止做空的核心规则。"
      },
      {
        id: "finding_demo_risk_pass",
        level: "pass",
        title: "风险规则通过",
        message: `计划风险按 ${plan.riskPercent}% 计算，用户最终确认后才可执行。`
      }
    ]
  };
}

function createBacktestReview(backtestResult: BacktestResult, reviewedAt: string): ReviewReport {
  return {
    id: `review_backtest_${Date.now()}`,
    light: "green",
    summary: `已生成 ${backtestResult.strategyName} mock 回测结果，暂不生成交易执行计划。`,
    canGenerateExecutionPlan: true,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: ["检查 MA30 策略是否符合你的交易周期。", "回测结果只能用于复盘和规则沉淀，不能直接当作买卖建议。"],
    findings: [
      {
        id: "finding_backtest_request_001",
        level: "pass",
        title: "识别 MA30 回测请求",
        message: "用户输入包含 30 均线和回测意图，系统生成 mock BacktestResult。"
      },
      {
        id: "finding_backtest_boundary_001",
        level: "warning",
        title: "仅为 mock 回测",
        message: "当前没有接真实行情和真实回测引擎，结果不构成交易建议。"
      }
    ]
  };
}

function createExecutionRecordedReview(
  plan: TradePlan,
  record: TradeRecord,
  reviewedAt: string
): ReviewReport {
  return {
    id: `review_execution_${record.id}`,
    planId: plan.id,
    recordId: record.id,
    light: "green",
    summary: "用户已确认计划，并生成 mock 交易记录。下一步可以进行单笔复盘。",
    canGenerateExecutionPlan: true,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: ["核对实际入场是否在计划区。", "记录是否遵守止损。", "生成单笔复盘报告。"],
    findings: [
      {
        id: `finding_execution_${record.id}`,
        level: "pass",
        title: "已记录执行结果",
        message: "这条记录来自用户确认后的计划，仅用于 mock 复盘。"
      }
    ]
  };
}

function createObservationReview(summary: string, reviewedAt: string): ReviewReport {
  return {
    id: `review_observation_${Date.now()}`,
    light: "yellow",
    summary,
    canGenerateExecutionPlan: false,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: ["等待新的符合体系的交易想法。", "不要为了有计划而强行寻找机会。"],
    findings: [
      {
        id: `finding_observation_${Date.now()}`,
        level: "warning",
        title: "进入观察状态",
        message: "当前不生成执行计划。"
      }
    ]
  };
}

function createRecordReview(record: TradeRecord, reviewedAt: string): ReviewReport {
  const followedPlan = record.followedPlan;
  const suggestion = createRuleSuggestion(record, reviewedAt);
  const annotations = createReviewAnnotations(record);

  return {
    id: `review_record_${record.id}_${Date.now()}`,
    planId: record.planId,
    recordId: record.id,
    light: followedPlan ? "green" : "yellow",
    summary: followedPlan
      ? "这笔交易基本遵守计划，复盘重点是体系样本积累，不因单笔结果临时改规则。"
      : "这笔交易存在执行偏差，先修正行为规则，再讨论下一笔机会。",
    canGenerateExecutionPlan: followedPlan,
    finalConfirmationRequired: true,
    reviewedAt,
    reviewTasks: [
      "核对实际入场、出场与原计划的差异。",
      "标记是否出现追单、提前离场或扩大止损。",
      "决定是否把 AI 规则建议写入规则库。"
    ],
    annotations,
    improvementSuggestions: followedPlan
      ? ["继续记录同类计划样本，不用因为单笔盈亏改变体系。"]
      : ["把执行偏差写入禁止规则。", "下一笔交易前先复述止损和失效条件。"],
    ruleSuggestions: [suggestion],
    findings: [
      {
        id: `finding_record_plan_${record.id}`,
        level: followedPlan ? "pass" : "warning",
        title: followedPlan ? "遵守计划" : "存在执行偏差",
        message: followedPlan ? "实际执行与计划基本一致。" : "记录显示交易没有完全按计划执行。"
      },
      {
        id: `finding_record_r_${record.id}`,
        level: (record.resultR ?? 0) >= 0 ? "pass" : "warning",
        title: "R 倍数结果",
        message: `本次结果为 ${formatR(record.resultR)}，用于复盘样本，不代表体系失效。`
      }
    ]
  };
}

function createMa30BacktestResult(data: WorkbenchData, createdAt: string): BacktestResult {
  return {
    id: `backtest_ma30_${Date.now()}`,
    strategyName: "MA30 均线趋势跟随策略",
    tradingSystemId: data.tradingSystem.id,
    symbol: data.market.symbol,
    timeframe: data.tradingSystem.timeframes[0] ?? "4H",
    period: {
      from: "2026-02-15",
      to: "2026-05-15"
    },
    sampleSize: 16,
    tradeCount: 16,
    winRatePercent: 56,
    totalReturnPercent: 12.4,
    averageRiskRewardRatio: 1.7,
    maxDrawdownR: 3.1,
    maxDrawdownPercent: 7.8,
    maxConsecutiveLosses: 3,
    totalReturnR: 6.2,
    aiSummary:
      "MA30 mock 回测显示，策略在趋势延续阶段表现较好，但震荡区间容易连续亏损。建议把它作为趋势过滤器，并继续保留止损、冷静期和每日交易次数限制。",
    summary:
      "MA30 mock 回测显示，策略在趋势延续阶段表现较好，但震荡区间容易连续亏损。",
    limitations: [
      `生成时间：${createdAt}`,
      "当前为 mock 数据，没有接真实行情和真实撮合。",
      "回测结果不能代表未来收益，也不能替代用户最终确认。"
    ]
  };
}

function createMa30Indicator(): ChartIndicator[] {
  return [
    {
      id: "indicator_ma30_mock",
      label: "MA30",
      type: "movingAverage",
      period: 30,
      points: [
        { time: "05-10", value: 64600 },
        { time: "05-11", value: 65220 },
        { time: "05-12", value: 65980 },
        { time: "05-13", value: 66520 },
        { time: "05-14", value: 67140 },
        { time: "05-15", value: 67860 }
      ]
    }
  ];
}

function createMa30BacktestAnnotations(symbol: string): ChartAnnotation[] {
  return [
    {
      id: "bt_buy_001",
      symbol,
      time: "05-11",
      price: 65480,
      label: "回测买点",
      type: "backtestBuy"
    },
    {
      id: "bt_win_001",
      symbol,
      time: "05-12",
      price: 66820,
      label: "盈利交易",
      type: "backtestWin"
    },
    {
      id: "bt_sell_001",
      symbol,
      time: "05-13",
      price: 66380,
      label: "回测卖点",
      type: "backtestSell"
    },
    {
      id: "bt_loss_001",
      symbol,
      time: "05-13",
      price: 66620,
      label: "亏损交易",
      type: "backtestLoss"
    },
    {
      id: "bt_buy_002",
      symbol,
      time: "05-14",
      price: 67520,
      label: "回测买点",
      type: "backtestBuy"
    },
    {
      id: "bt_drawdown_001",
      symbol,
      time: "05-14",
      price: 67050,
      label: "回撤",
      type: "drawdown"
    },
    {
      id: "bt_win_002",
      symbol,
      time: "05-15",
      price: 68680,
      label: "盈利交易",
      type: "backtestWin"
    }
  ];
}

function createMockPlan(data: WorkbenchData, idea: string, createdAt: string): TradePlan {
  const price = data.market.price;
  const roundPrice = (value: number) => Math.round(value / 10) * 10;
  const entryPrice = roundPrice(price * 0.988);
  const stopLossPrice = roundPrice(price * 0.97);
  const takeProfitPrice = roundPrice(price * 1.03);
  const risk = Math.max(entryPrice - stopLossPrice, 1);
  const reward = Math.max(takeProfitPrice - entryPrice, 1);

  return {
    id: `plan_demo_${Date.now()}`,
    signalId: data.tradeSignal.id,
    symbol: data.market.symbol,
    timeframe: data.tradingSystem.timeframes[0] ?? data.tradeSignal.timeframe,
    direction: idea.includes("做空") ? "short" : "long",
    planStatus: "draft",
    confirmationStatus: "pending",
    light: "green",
    entryZone: `${roundPrice(entryPrice * 0.998)} - ${roundPrice(entryPrice * 1.002)}`,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    invalidationCondition: `如果价格跌破 ${stopLossPrice} 或没有出现用户偏好的确认信号，计划失效。`,
    riskRewardRatio: Number((reward / risk).toFixed(2)),
    riskPercent: data.tradingSystem.maxRiskPerTradePercent,
    positionSizingNote: `按账户单笔 ${data.tradingSystem.maxRiskPerTradePercent}% 风险计算仓位，用户最终确认后才可执行。`,
    executionChecklist: [
      "价格必须回到计划入场区。",
      "止损价和失效条件必须保持不变。",
      `确认今日交易次数未超过 ${data.tradingSystem.maxDailyTradeCount} 次。`
    ],
    reviewFocus: ["是否等待确认信号", "是否临时改变止损", "是否在计划区内入场"],
    rationale: [
      `用户想法：${idea}`,
      "当前 mock 行情趋势没有触发核心红灯。",
      "计划包含明确入场、止损、止盈，满足生成计划草案的最低要求。"
    ],
    userConfirmationRequired: true,
    createdAt
  };
}

function createTradeRecordFromPlan(plan: TradePlan, createdAt: string): TradeRecord {
  const exitPrice = plan.direction === "long" ? plan.takeProfitPrice : plan.stopLossPrice;

  return {
    id: `record_from_${plan.id}_${Date.now()}`,
    planId: plan.id,
    symbol: plan.symbol,
    direction: plan.direction,
    status: "closed",
    plannedEntryPrice: plan.entryPrice,
    actualEntryPrice: plan.entryPrice,
    plannedStopLossPrice: plan.stopLossPrice,
    exitPrice,
    resultR: plan.direction === "long" ? 1.42 : -0.65,
    followedPlan: true,
    mistakeTags: ["按计划执行"],
    notes: "由用户确认计划后生成的 mock 交易记录，没有真实下单。",
    openedAt: createdAt,
    closedAt: createdAt
  };
}

function createPlanAnnotations(plan: TradePlan): ChartAnnotation[] {
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
    },
    {
      id: `ann_invalid_${plan.id}`,
      symbol: plan.symbol,
      time: "当前",
      price: plan.stopLossPrice * 0.998,
      label: "失效",
      type: "invalid",
      relatedId: plan.id
    }
  ];
}

function createReviewAnnotations(record: TradeRecord): ChartAnnotation[] {
  const actualEntry = record.actualEntryPrice ?? record.plannedEntryPrice;
  const actualExit = record.exitPrice ?? actualEntry;

  return [
    {
      id: `ann_review_entry_${record.id}`,
      symbol: record.symbol,
      time: "复盘",
      price: actualEntry,
      label: "实际入场",
      type: "actualEntry",
      relatedId: record.id
    },
    {
      id: `ann_review_exit_${record.id}`,
      symbol: record.symbol,
      time: "复盘",
      price: actualExit,
      label: "实际出场",
      type: "actualExit",
      relatedId: record.id
    },
    {
      id: `ann_review_note_${record.id}`,
      symbol: record.symbol,
      time: "复盘",
      price: record.plannedStopLossPrice,
      label: record.followedPlan ? "计划内" : "执行偏差",
      type: record.followedPlan ? "review" : "error",
      note: record.notes,
      relatedId: record.id
    }
  ];
}

function createRuleSuggestion(record: TradeRecord, createdAt: string): RuleSuggestion {
  return {
    id: `rule_suggestion_${record.id}`,
    source: "review",
    status: "pending",
    title: record.followedPlan ? "保留计划内亏损样本" : "禁止执行偏差后继续开仓",
    description: record.followedPlan
      ? "这笔交易遵守计划，建议把计划内亏损也纳入有效样本，避免因单笔结果否定体系。"
      : "出现执行偏差后，应停止寻找下一笔机会，先完成复盘。",
    proposedRule: {
      id: record.followedPlan ? "rule_keep_planned_loss_sample" : "rule_stop_after_execution_error",
      title: record.followedPlan ? "计划内亏损不触发体系修改" : "执行偏差后必须先复盘",
      description: record.followedPlan
        ? "只要交易按计划执行，单笔亏损只能进入样本记录，不能临时修改核心规则。"
        : "若出现追单、扩大止损或提前离场，完成复盘前不生成新的执行计划。",
      category: "review",
      severity: "warning",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    relatedId: record.id,
    createdAt
  };
}

function mergeRuleSuggestions(
  current: RuleSuggestion[],
  incoming: RuleSuggestion[]
): RuleSuggestion[] {
  const existingIds = new Set(current.map((suggestion) => suggestion.id));
  const uniqueIncoming = incoming.filter((suggestion) => !existingIds.has(suggestion.id));

  return [...uniqueIncoming, ...current];
}

function appendAssistantMessage(
  data: WorkbenchData,
  userMessage: AssistantMessage,
  assistantContent: string
): WorkbenchData {
  const assistantMessage = createAssistantMessage(assistantContent, new Date().toISOString());

  return {
    ...data,
    messages: [...data.messages, userMessage, assistantMessage]
  };
}

function createUserMessage(content: string, createdAt: string): AssistantMessage {
  return {
    id: `msg_user_${Date.now()}`,
    role: "user",
    content,
    createdAt
  };
}

function createAssistantMessage(content: string, createdAt: string): AssistantMessage {
  return {
    id: `msg_assistant_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    role: "assistant",
    content,
    createdAt
  };
}

function createAiSuggestion(
  source: AiSuggestion["source"],
  priority: AiSuggestion["priority"],
  title: string,
  message: string,
  relatedId: string | undefined,
  createdAt: string
): AiSuggestion {
  return {
    id: `ai_suggestion_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    source,
    priority,
    title,
    message,
    relatedId,
    resolved: false,
    createdAt
  };
}

function formatR(resultR: number | undefined) {
  if (resultR === undefined) {
    return "0R";
  }

  return `${resultR > 0 ? "+" : ""}${resultR}R`;
}

function bumpPatchVersion(version: string) {
  const parts = version.split(".").map((part) => Number(part));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return `${version}+rule`;
  }

  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
