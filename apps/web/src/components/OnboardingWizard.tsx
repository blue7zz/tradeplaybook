"use client";

import type { SignalDefinition, TradingRule, UserTradingSystem } from "@tradeplaybook/shared";
import { useMemo, useState } from "react";

interface OnboardingWizardProps {
  userId: string;
  onComplete: (tradingSystem: UserTradingSystem) => void;
}

interface OnboardingAnswers {
  marketScope: string;
  timeframes: string[];
  tradingStyle: string;
  maxRiskPerTradePercent: number;
  maxDailyTradeCount: number;
  commonMistakes: string[];
  preferredSignals: string[];
}

const marketOptions = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "NASDAQ 100", "XAU/USD"];
const timeframeOptions = ["15m", "1H", "4H", "1D"];
const tradingStyleOptions = ["趋势回调", "突破回踩", "区间反转", "日内短线"];
const riskOptions = [0.5, 1, 1.5, 2];
const dailyTradeOptions = [1, 2, 3, 5];
const mistakeOptions = ["追单", "临时扩大止损", "止损后立刻开仓", "满仓冲动", "没有计划就进场"];
const signalOptions = ["趋势线回踩", "支撑压力反应", "均线回踩", "放量突破", "收盘确认"];

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    marketScope: "BTC/USDT",
    timeframes: ["4H"],
    tradingStyle: "趋势回调",
    maxRiskPerTradePercent: 1,
    maxDailyTradeCount: 3,
    commonMistakes: ["追单"],
    preferredSignals: ["支撑压力反应", "收盘确认"]
  });

  const canComplete = useMemo(
    () =>
      answers.marketScope.length > 0 &&
      answers.timeframes.length > 0 &&
      answers.tradingStyle.length > 0 &&
      answers.commonMistakes.length > 0 &&
      answers.preferredSignals.length > 0,
    [answers]
  );

  function updateAnswer<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleListValue(key: "timeframes" | "commonMistakes" | "preferredSignals", value: string) {
    setAnswers((current) => {
      const values = current[key];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];

      return {
        ...current,
        [key]: nextValues
      };
    });
  }

  function completeOnboarding() {
    if (!canComplete) {
      return;
    }

    onComplete(createMockTradingSystem(userId, answers));
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[1180px] grid-cols-[0.82fr_1.18fr] gap-5 px-5 py-5">
      <aside className="rounded-lg border border-line bg-ink p-6 text-white shadow-panel">
        <p className="text-xs font-bold uppercase text-white/60">TradePlaybook AI</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">先建立你的交易体系</h1>
        <p className="mt-4 text-sm leading-6 text-white/70">
          第一次进入系统时，AI 不会直接寻找交易机会。先确认品种、周期、风格、风险和禁止事项，再进入工作台。
        </p>

        <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-4">
          <p className="text-sm font-bold">初始化后会生成</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <span>个人交易体系 mock 对象</span>
            <span>初始禁止规则</span>
            <span>偏好信号和复盘约束</span>
            <span>需要用户最终确认的执行边界</span>
          </div>
        </div>
      </aside>

      <section className="rounded-lg border border-line bg-panel shadow-panel">
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-bold uppercase text-muted">Onboarding Wizard</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">新用户交易体系初始化</h2>
        </div>

        <div className="grid gap-6 p-6">
          <SingleChoice
            label="主要交易品种"
            options={marketOptions}
            value={answers.marketScope}
            onChange={(value) => updateAnswer("marketScope", value)}
          />
          <MultiChoice
            label="常用交易周期"
            options={timeframeOptions}
            values={answers.timeframes}
            onToggle={(value) => toggleListValue("timeframes", value)}
          />
          <SingleChoice
            label="交易风格"
            options={tradingStyleOptions}
            value={answers.tradingStyle}
            onChange={(value) => updateAnswer("tradingStyle", value)}
          />
          <SingleChoice
            label="单笔最大可接受亏损"
            options={riskOptions.map((risk) => `${risk}%`)}
            value={`${answers.maxRiskPerTradePercent}%`}
            onChange={(value) => updateAnswer("maxRiskPerTradePercent", Number(value.replace("%", "")))}
          />
          <SingleChoice
            label="每日最多交易次数"
            options={dailyTradeOptions.map((count) => `${count} 次`)}
            value={`${answers.maxDailyTradeCount} 次`}
            onChange={(value) => updateAnswer("maxDailyTradeCount", Number(value.replace(" 次", "")))}
          />
          <MultiChoice
            label="常犯错误"
            options={mistakeOptions}
            values={answers.commonMistakes}
            onToggle={(value) => toggleListValue("commonMistakes", value)}
          />
          <MultiChoice
            label="偏好的交易信号"
            options={signalOptions}
            values={answers.preferredSignals}
            onToggle={(value) => toggleListValue("preferredSignals", value)}
          />

          <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
            <p className="text-sm text-muted">完成后进入 AI 交易工作台，第一版保存在浏览器 localStorage。</p>
            <button
              className="rounded-md bg-ink px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-muted"
              disabled={!canComplete}
              onClick={completeOnboarding}
              type="button"
            >
              生成交易体系
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

interface ChoiceProps {
  label: string;
  options: string[];
}

interface SingleChoiceProps extends ChoiceProps {
  value: string;
  onChange: (value: string) => void;
}

function SingleChoice({ label, options, value, onChange }: SingleChoiceProps) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <button
              className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-[#fbfaf7] text-muted hover:border-ink hover:text-ink"
              }`}
              key={option}
              onClick={() => onChange(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface MultiChoiceProps extends ChoiceProps {
  values: string[];
  onToggle: (value: string) => void;
}

function MultiChoice({ label, options, values, onToggle }: MultiChoiceProps) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = values.includes(option);

          return (
            <button
              className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-success bg-[#eef8f3] text-success"
                  : "border-line bg-[#fbfaf7] text-muted hover:border-ink hover:text-ink"
              }`}
              key={option}
              onClick={() => onToggle(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function createMockTradingSystem(userId: string, answers: OnboardingAnswers): UserTradingSystem {
  const now = new Date().toISOString();
  const rules: TradingRule[] = [
    {
      id: "rule_onboarding_market",
      title: `只交易 ${answers.marketScope}`,
      description: `当前 MVP 体系只围绕 ${answers.marketScope} 生成观察、审核和计划草案。`,
      category: "discipline",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "rule_onboarding_timeframe",
      title: `只看 ${answers.timeframes.join(" / ")} 周期`,
      description: "AI 只基于用户确认的常用周期审核交易想法。",
      category: "entry",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "rule_onboarding_risk",
      title: `单笔风险不超过 ${answers.maxRiskPerTradePercent}%`,
      description: "任何计划必须先定义止损，再按最大可接受亏损计算仓位。",
      category: "risk",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "rule_onboarding_signal",
      title: `优先等待 ${answers.preferredSignals.join("、")}`,
      description: "没有偏好信号或等价确认时，只能观察，不能生成执行计划。",
      category: "entry",
      severity: "warning",
      status: "active",
      canBeTemporarilyBypassed: true
    }
  ];

  const forbiddenRules: TradingRule[] = [
    {
      id: "ban_after_stop_cooldown",
      title: "止损后 60 分钟禁止交易",
      description: "任何止损发生后，系统进入冷静期，60 分钟内不能生成新的执行计划。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "ban_three_stops_daily",
      title: "每日止损 3 次后禁止交易",
      description: "当日止损达到 3 次后，系统进入红灯状态，停止生成执行计划。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "ban_no_stop_loss",
      title: "无明确止损禁止交易",
      description: "没有预设止损价和计划失效条件时，AI 必须阻止交易计划。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    },
    {
      id: "ban_chasing_entry",
      title: "禁止追单",
      description: "价格离开计划区后，不能因为害怕错过而追价入场。",
      category: "forbidden",
      severity: "core",
      status: "active",
      canBeTemporarilyBypassed: false
    }
  ];
  const signalDefinitions: SignalDefinition[] = answers.preferredSignals.map((signal, index) => ({
    id: `signal_onboarding_${index + 1}`,
    tradingSystemId: "system_onboarding_mock_001",
    name: signal,
    direction: "long",
    timeframe: answers.timeframes[0] ?? "4H",
    triggerConditions: [
      `${answers.marketScope} 符合 ${answers.tradingStyle} 背景`,
      `出现 ${signal}`,
      "入场前确认止损和失效条件"
    ],
    invalidationConditions: ["没有明确止损", "价格离开计划区后追价", "触发冷静期或每日交易次数限制"],
    confirmationRequired: true,
    displayLabel: signal
  }));

  return {
    id: "system_onboarding_mock_001",
    userId,
    name: `${answers.tradingStyle} 初始交易体系`,
    version: "0.1.0",
    marketScope: answers.marketScope,
    timeframes: answers.timeframes,
    tradingStyle: answers.tradingStyle,
    maxRiskPerTradePercent: answers.maxRiskPerTradePercent,
    maxDailyLossPercent: 3,
    maxDailyTradeCount: answers.maxDailyTradeCount,
    commonMistakes: answers.commonMistakes,
    preferredSignals: answers.preferredSignals,
    positionSizingRule: {
      id: "position_rule_onboarding",
      title: "固定单笔风险仓位",
      riskPerTradePercent: answers.maxRiskPerTradePercent,
      maxDailyLossPercent: 3,
      afterLossAdjustment: "止损后先等待冷静期，连续亏损时降低交易频率。",
      note: "仓位计算只用于计划草案，所有执行都需要用户最终确认。"
    },
    signalDefinitions,
    rules,
    forbiddenRules,
    userFinalConfirmationRequired: true,
    updatedAt: now
  };
}
