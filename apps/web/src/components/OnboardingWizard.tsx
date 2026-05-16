"use client";

import type {
  SignalDefinition,
  TradingRule,
  UserTradingSystem
} from "@tradeplaybook/shared";
import { useMemo, useState } from "react";
import { streamOnboardingChat } from "../lib/marketApi";

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

interface WizardOption {
  value: string | number;
  title: string;
  description: string;
  icon: string;
}

interface WizardStep {
  key:
    | "marketScope"
    | "timeframes"
    | "tradingStyle"
    | "maxRiskPerTradePercent"
    | "commonMistakes"
    | "maxDailyTradeCount"
    | "preferredSignals"
    | "final";
  title: string;
  prompt: string;
  mode: "single" | "multi" | "final";
  options: WizardOption[];
}

interface OnboardingChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  candidateMarketScope?: string;
}

interface AiProgressState {
  status: "idle" | "running" | "done" | "error";
  activeIndex: number;
  detail?: string;
}

const aiProgressSteps = [
  "整理当前体系上下文",
  "AI 识别币种/交易对",
  "调用 OKX 交易对查询",
  "AI 判断回显内容",
  "生成可确认建议"
];

const aiProgressStepMap: Record<string, number> = {
  context: 0,
  ai_inference: 1,
  okx_lookup: 2,
  okx_result: 2,
  ai_response: 3
};

const marketOptions: WizardOption[] = [
  { value: "BTC/USDT", title: "BTC / USDT", description: "流动性高，适合先建立主交易样本", icon: "BTC" },
  { value: "ETH/USDT", title: "ETH / USDT", description: "波动节奏清晰，适合趋势和回踩", icon: "ETH" },
  { value: "SOL/USDT", title: "SOL / USDT", description: "波动更快，需要更严格止损", icon: "SOL" },
  { value: "NASDAQ 100", title: "NASDAQ 100", description: "宏观和科技权重驱动明显", icon: "NDX" },
  { value: "XAU/USD", title: "XAU / USD", description: "避险与美元因素更重要", icon: "XAU" }
];

const timeframeOptions: WizardOption[] = [
  { value: "15m", title: "15m / 30m 短线", description: "节奏更快，适合日内计划", icon: "15" },
  { value: "1H", title: "1H 定方向", description: "兼顾入场节奏和趋势过滤", icon: "1H" },
  { value: "4H", title: "4H 波段", description: "中期趋势，减少噪音交易", icon: "4H" },
  { value: "1D", title: "日线级别", description: "更少交易，更看重耐心等待", icon: "1D" }
];

const tradingStyleOptions: WizardOption[] = [
  { value: "趋势回调", title: "趋势回调", description: "先确认趋势，再等待回踩入场", icon: "TR" },
  { value: "突破回踩", title: "突破回踩", description: "突破后等待二次确认", icon: "BO" },
  { value: "区间反转", title: "区间反转", description: "围绕支撑压力做风险受控反应", icon: "RV" },
  { value: "日内短线", title: "日内短线", description: "更高频，但必须控制交易次数", icon: "DT" }
];

const riskOptions: WizardOption[] = [
  { value: 0.5, title: "0.5% 保守", description: "优先保护本金，适合体系磨合期", icon: "R1" },
  { value: 1, title: "1% 标准", description: "单笔风险清晰，适合多数 MVP 场景", icon: "R2" },
  { value: 1.5, title: "1.5% 进取", description: "需要更稳定的执行纪律", icon: "R3" },
  { value: 2, title: "2% 高风险", description: "只建议在规则成熟后使用", icon: "R4" }
];

const dailyTradeOptions: WizardOption[] = [
  { value: 1, title: "每日最多 1 次", description: "极简决策，减少冲动交易", icon: "01" },
  { value: 2, title: "每日最多 2 次", description: "保留一次修正机会", icon: "02" },
  { value: 3, title: "每日最多 3 次", description: "达到止损上限后必须停手", icon: "03" },
  { value: 5, title: "每日最多 5 次", description: "只适合严格日内交易者", icon: "05" }
];

const mistakeOptions: WizardOption[] = [
  { value: "追单", title: "追单", description: "价格离开计划区后仍冲动入场", icon: "NO" },
  { value: "临时扩大止损", title: "临时扩大止损", description: "亏损后改变原计划", icon: "SL" },
  { value: "止损后立刻开仓", title: "止损后立刻开仓", description: "情绪性补单和报复交易", icon: "CD" },
  { value: "满仓冲动", title: "满仓冲动", description: "仓位超出体系允许范围", icon: "MAX" },
  { value: "没有计划就进场", title: "没有计划就进场", description: "缺少入场、止损和失效条件", icon: "N/A" }
];

const signalOptions: WizardOption[] = [
  { value: "趋势线回踩", title: "趋势线回踩", description: "趋势保持时等待回踩确认", icon: "TL" },
  { value: "支撑压力反应", title: "支撑压力反应", description: "在关键价格区观察反应", icon: "SR" },
  { value: "均线回踩", title: "均线回踩", description: "用均线过滤趋势和节奏", icon: "MA" },
  { value: "放量突破", title: "放量突破", description: "突破需要成交量配合", icon: "VOL" },
  { value: "收盘确认", title: "收盘确认", description: "避免盘中假突破", icon: "CLS" }
];

const wizardSteps: WizardStep[] = [
  {
    key: "marketScope",
    title: "选择你的主要交易品种",
    prompt: "先确定主要交易品种。第一版建议只选一个主市场，避免体系还没稳定就被多品种节奏打乱。",
    mode: "single",
    options: marketOptions
  },
  {
    key: "timeframes",
    title: "选择你的交易周期",
    prompt: "你通常倾向于看哪个时间周期制定交易计划？可以选择多个，但需要明确主周期和入场周期。",
    mode: "multi",
    options: timeframeOptions
  },
  {
    key: "tradingStyle",
    title: "选择你的交易风格",
    prompt: "接下来定义你的交易风格。AI 后续会用它过滤不符合体系的交易想法。",
    mode: "single",
    options: tradingStyleOptions
  },
  {
    key: "maxRiskPerTradePercent",
    title: "设置单笔最大可接受亏损",
    prompt: "每笔交易先定义最大可接受亏损。没有明确止损时，系统必须阻止生成执行计划。",
    mode: "single",
    options: riskOptions
  },
  {
    key: "commonMistakes",
    title: "确认你的禁止事项",
    prompt: "请选择你最容易犯的错误。它们会被转成初始禁止规则和复盘检查项。",
    mode: "multi",
    options: mistakeOptions
  },
  {
    key: "maxDailyTradeCount",
    title: "设置每日最多交易次数",
    prompt: "设置每日交易频率上限。交易体系不是让你多交易，而是帮你在不该交易时停下来。",
    mode: "single",
    options: dailyTradeOptions
  },
  {
    key: "preferredSignals",
    title: "选择偏好的交易信号",
    prompt: "最后选择你认可的入场信号。缺少确认信号时，AI 只允许观察，不生成执行计划。",
    mode: "multi",
    options: signalOptions
  },
  {
    key: "final",
    title: "生成你的交易体系 v1",
    prompt: "体系草稿已生成。请确认这些规则符合你的真实交易习惯，进入工作台后 AI 会按这些规则审核交易想法。",
    mode: "final",
    options: []
  }
];

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState<AiProgressState>({
    status: "idle",
    activeIndex: 0
  });
  const [chatMessages, setChatMessages] = useState<OnboardingChatMessage[]>([]);
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
  const currentStep = wizardSteps[stepIndex];
  const isFinalStep = currentStep.mode === "final";
  const progressPercent = Math.round(((stepIndex + 1) / wizardSteps.length) * 100);

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

  function selectOption(value: string | number) {
    switch (currentStep.key) {
      case "marketScope":
        updateAnswer("marketScope", String(value));
        break;
      case "timeframes":
        toggleListValue("timeframes", String(value));
        break;
      case "tradingStyle":
        updateAnswer("tradingStyle", String(value));
        break;
      case "maxRiskPerTradePercent":
        updateAnswer("maxRiskPerTradePercent", Number(value));
        break;
      case "commonMistakes":
        toggleListValue("commonMistakes", String(value));
        break;
      case "maxDailyTradeCount":
        updateAnswer("maxDailyTradeCount", Number(value));
        break;
      case "preferredSignals":
        toggleListValue("preferredSignals", String(value));
        break;
      default:
        break;
    }
  }

  function isSelected(value: string | number) {
    switch (currentStep.key) {
      case "marketScope":
        return answers.marketScope === value;
      case "timeframes":
        return answers.timeframes.includes(String(value));
      case "tradingStyle":
        return answers.tradingStyle === value;
      case "maxRiskPerTradePercent":
        return answers.maxRiskPerTradePercent === value;
      case "commonMistakes":
        return answers.commonMistakes.includes(String(value));
      case "maxDailyTradeCount":
        return answers.maxDailyTradeCount === value;
      case "preferredSignals":
        return answers.preferredSignals.includes(String(value));
      default:
        return false;
    }
  }

  function completeOnboarding() {
    if (!canComplete) {
      return;
    }

    onComplete(createMockTradingSystem(userId, answers));
  }

  function goNext() {
    if (isFinalStep) {
      completeOnboarding();
      return;
    }

    setCustomInput("");
    setStepIndex((current) => Math.min(current + 1, wizardSteps.length - 1));
  }

  function goPrevious() {
    setCustomInput("");
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleCustomSubmit() {
    const trimmed = customInput.trim();

    if (!trimmed || isFinalStep) {
      return;
    }

    const createdAt = Date.now();
    const userMessage: OnboardingChatMessage = {
      id: `onboarding_user_${createdAt}`,
      role: "user",
      content: trimmed
    };

    setCustomInput("");
    setChatMessages((current) => [...current, userMessage]);
    setIsChatBusy(true);
    setAiProgress({
      status: "running",
      activeIndex: 0,
      detail: "等待服务端开始处理。"
    });

    try {
      await streamOnboardingChat(
        {
          message: trimmed,
          stepKey: currentStep.key,
          stepTitle: currentStep.title,
          answers
        },
        {
          onProgress: (event) => {
            setAiProgress({
              status: "running",
              activeIndex: aiProgressStepMap[event.step] ?? 0,
              detail: event.message
            });
          },
          onFinal: (response) => {
            const candidate = response.actions.find((action) => action.type === "SUGGEST_MARKET");

            setChatMessages((current) => [
              ...current,
              {
                id: `onboarding_ai_${Date.now()}`,
                role: "assistant",
                content: response.message,
                candidateMarketScope: candidate?.marketScope
              }
            ]);
            setAiProgress({
              status: "done",
              activeIndex: aiProgressSteps.length - 1,
              detail: candidate
                ? `已确认 ${candidate.marketScope}，等待你决定是否加入。`
                : `已完成回复，来源：${response.source}。`
            });
          },
          onError: (event) => {
            throw new Error(event.error || event.message);
          }
        }
      );
    } catch {
      setChatMessages((current) => [
        ...current,
        {
          id: `onboarding_ai_${Date.now()}`,
          role: "assistant",
          content:
            "我暂时无法连接 AI 引导服务。你仍可以先使用快捷选项继续建立交易体系；辅助决策，不是投资建议。"
        }
      ]);
      setAiProgress({
        status: "error",
        activeIndex: aiProgressSteps.length - 1,
        detail: "AI 引导服务暂时不可用，可以先用快捷选项继续。"
      });
    } finally {
      setIsChatBusy(false);
    }
  }

  function acceptMarketCandidate(marketScope: string) {
    updateAnswer("marketScope", marketScope);
    setStepIndex(0);
    setChatMessages((current) => [
      ...current,
      {
        id: `onboarding_ai_accept_${Date.now()}`,
        role: "assistant",
        content: `已把 ${marketScope} 加入交易品种草稿。后续 AI 会按你的体系审核它；辅助决策，不是投资建议。`
      }
    ]);
    setCustomInput("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121317] font-sans text-[#e3e2e7] selection:bg-[#5e6ad2] selection:text-white">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#454652] bg-[#121317] px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5e6ad2] font-mono text-sm font-bold text-white">
              TP
            </div>
            <div>
              <p className="text-lg font-bold text-[#bdc2ff]">TradePlaybook AI</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#908f9e]">
                System Builder
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-[#c6c5d5] md:flex">
            <span>市场</span>
            <span>交易体系</span>
            <span>复盘</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill label="AI" value="服务端" />
          <StatusPill label="数据" value="Mock/OKX" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#454652] bg-[#1f1f24] font-mono text-xs text-[#bdc2ff]">
            U
          </div>
        </div>
      </header>

      <main className="grid h-screen grid-cols-[256px_minmax(0,1fr)_300px] overflow-hidden pb-10 pt-16">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-[#454652] bg-[#1a1b20] px-5 py-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#908f9e]">生成进度</p>
            <div className="mt-2 h-1 w-12 rounded-full bg-[#bdc2ff]" />
          </div>
          <nav className="relative space-y-1.5">
            <div
              aria-hidden="true"
              className="absolute bottom-5 left-5 top-5 w-px bg-[#454652]"
            />
            {wizardSteps.map((step, index) => (
              <StepItem
                isActive={index === stepIndex}
                isComplete={index < stepIndex}
                isLast={index === wizardSteps.length - 1}
                key={step.key}
                label={step.key === "final" ? step.title : step.title.replace("选择你的", "").replace("设置", "").replace("确认你的", "")}
                stepNumber={index + 1}
              />
            ))}
          </nav>
        </aside>

        <section className="flex min-h-0 flex-col bg-[#121317] px-6 py-5">
          <div className="mx-auto flex min-h-0 w-full max-w-[1000px] flex-1 flex-col">
            <div className="mb-4">
              <p className="mb-1 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#bdc2ff]">
                第 {stepIndex + 1} 步 / {wizardSteps.length} · {progressPercent}%
              </p>
              <h1 className="text-2xl font-semibold leading-tight text-[#e3e2e7]">
                {currentStep.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c6c5d5]">
                AI 不会替你自动交易，也不会承诺盈利。这里先建立你的交易体系，后续只按体系审核交易想法。
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5e6ad2] font-mono text-xs font-bold text-white shadow-[0_0_18px_rgba(94,106,210,0.3)]">
                  AI
                </div>
                <div className="max-w-2xl rounded-lg border border-white/10 bg-[#1c1d25] px-5 py-4">
                  <p className="text-sm leading-6 text-[#e3e2e7]">{currentStep.prompt}</p>
                  <span className="mt-2 block text-xs text-[#908f9e]">交易体系助手 · 刚刚</span>
                </div>
              </div>

              {chatMessages.length > 0 ? (
                <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-2">
                  {chatMessages.map((message) => (
                    <div
                      className={`rounded-lg border px-4 py-3 ${
                        message.role === "user"
                          ? "ml-auto max-w-[78%] border-[#454652] bg-[#292a2e]"
                          : "mr-auto max-w-[86%] border-[#5e6ad2]/35 bg-[#1c1d25]"
                      }`}
                      key={message.id}
                    >
                      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#908f9e]">
                        {message.role === "user" ? "USER" : "AI"}
                      </p>
                      <p className="whitespace-pre-line text-sm leading-6 text-[#e3e2e7]">
                        {message.content}
                      </p>
                      {message.candidateMarketScope ? (
                        <button
                          className="mt-3 rounded-md bg-[#5e6ad2] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#6f79dd]"
                          onClick={() => acceptMarketCandidate(message.candidateMarketScope ?? "")}
                          type="button"
                        >
                          加入 {message.candidateMarketScope}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {isFinalStep ? (
                <FinalSystemPreview answers={answers} />
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {currentStep.options.map((option) => (
                    <OptionCard
                      description={option.description}
                      icon={option.icon}
                      isActive={isSelected(option.value)}
                      key={String(option.value)}
                      onClick={() => selectOption(option.value)}
                      title={option.title}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-[#454652]/70 pt-4">
              <AiProgressPanel progress={aiProgress} />
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-[#908f9e]">
                    CMD
                  </span>
                  <input
                    className="h-11 w-full rounded-lg border-0 bg-[#292a2e] pl-16 pr-4 text-sm text-[#e3e2e7] outline-none ring-1 ring-transparent transition placeholder:text-[#908f9e] focus:ring-2 focus:ring-[#5e6ad2]"
                    disabled={isFinalStep}
                    onChange={(event) => setCustomInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCustomSubmit();
                      }
                    }}
                    placeholder={isFinalStep ? "体系草稿已生成，点击完成进入工作台" : "输入 XRP/USDT，AI 会查 OKX 并询问是否加入"}
                    value={customInput}
                  />
                </div>
                <button
                  className="flex h-11 items-center gap-2 rounded-lg bg-[#5e6ad2] px-6 text-sm font-bold text-white transition hover:bg-[#6f79dd] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#454652]"
                  disabled={isChatBusy || (isFinalStep ? !canComplete : false)}
                  onClick={() => {
                    if (customInput.trim() && !isFinalStep) {
                      void handleCustomSubmit();
                      return;
                    }

                    goNext();
                  }}
                  type="button"
                >
                  {isChatBusy ? "AI 思考中" : customInput.trim() && !isFinalStep ? "发送给 AI" : isFinalStep ? "生成体系" : "继续"}
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-sm">
                <button
                  className="text-[#c6c5d5] transition hover:text-[#e3e2e7] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={stepIndex === 0}
                  onClick={goPrevious}
                  type="button"
                >
                  &lt;- 上一步
                </button>
                <button
                  className="text-[#bdc2ff] transition hover:text-white"
                  onClick={goNext}
                  type="button"
                >
                  {isFinalStep ? "进入工作台" : "跳过，稍后补充"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <DraftPanel answers={answers} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-30 flex h-10 items-center justify-between border-t border-[#454652] bg-[#0d0e12] px-8">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#908f9e]">
          系统状态: 正常 | 风险: 低 | 模式: 辅助决策
        </div>
        <div className="hidden gap-6 font-mono text-xs text-[#ffb867] md:flex">
          <span>OKX: 只读行情</span>
          <span>自动交易: 禁用</span>
        </div>
      </footer>
    </div>
  );
}

function StepItem({
  isActive,
  isComplete,
  isLast,
  label,
  stepNumber
}: {
  isActive: boolean;
  isComplete: boolean;
  isLast: boolean;
  label: string;
  stepNumber: number;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-2.5 py-2 ${
        isActive ? "border border-[#5e6ad2]/40 bg-[#434764]/20" : "border border-transparent"
      }`}
    >
      <div className="relative z-10 flex w-5 shrink-0 justify-center">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
            isComplete || isActive
              ? "bg-[#5e6ad2] text-white"
              : "border border-[#454652] bg-[#1a1b20] text-[#908f9e]"
          }`}
        >
          {isComplete ? "✓" : stepNumber}
        </div>
        {!isLast && isComplete ? (
          <div className="absolute left-1/2 top-5 h-[calc(100%+6px)] w-px -translate-x-1/2 bg-[#5e6ad2]" />
        ) : null}
      </div>
      <div>
        <p className={`text-[13px] leading-5 ${isActive ? "font-bold text-[#bdc2ff]" : "text-[#c6c5d5]"}`}>
          {stepNumber}. {label}
        </p>
        <p className="text-[11px] leading-4 text-[#908f9e]">
          {isComplete ? "已完成" : isActive ? "当前步骤" : "待选择"}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden rounded-full border border-[#454652] bg-[#1f1f24] px-3 py-1.5 text-xs md:block">
      <span className="text-[#908f9e]">{label}: </span>
      <span className="font-mono text-[#bdc2ff]">{value}</span>
    </div>
  );
}

function AiProgressPanel({ progress }: { progress: AiProgressState }) {
  if (progress.status === "idle") {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-[#454652] bg-[#1c1d25] px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              progress.status === "running"
                ? "animate-pulse bg-[#bdc2ff]"
                : progress.status === "done"
                  ? "bg-[#74d7a7]"
                  : "bg-[#ffb4ab]"
            }`}
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#bdc2ff]">
            AI 交互进度
          </p>
        </div>
        <span className="text-[11px] text-[#908f9e]">
          {progress.status === "running" ? "处理中" : progress.status === "done" ? "完成" : "异常"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {aiProgressSteps.map((step, index) => {
          const isActive = progress.activeIndex === index && progress.status === "running";
          const isDone =
            progress.status === "done" ||
            progress.status === "error" ||
            index < progress.activeIndex;

          return (
            <div key={step}>
              <div
                className={`h-1 rounded-full ${
                  isActive
                    ? "bg-[#bdc2ff]"
                    : isDone
                      ? "bg-[#5e6ad2]"
                      : "bg-[#343439]"
                }`}
              />
              <p
                className={`mt-1 truncate text-[11px] ${
                  isActive || isDone ? "text-[#e3e2e7]" : "text-[#908f9e]"
                }`}
              >
                {step}
              </p>
            </div>
          );
        })}
      </div>
      {progress.detail ? (
        <p className="mt-2 text-xs leading-5 text-[#c6c5d5]">{progress.detail}</p>
      ) : null}
    </div>
  );
}

function OptionCard({
  description,
  icon,
  isActive,
  onClick,
  title
}: {
  description: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`relative flex min-h-[96px] items-start gap-3 rounded-lg border p-4 text-left transition ${
        isActive
          ? "border-[#5e6ad2] bg-[#5e6ad2]/10 shadow-[0_0_18px_rgba(94,106,210,0.22)]"
          : "border-white/10 bg-[#1c1d25] hover:border-[#5e6ad2]/70"
      }`}
      onClick={onClick}
      type="button"
    >
      {isActive ? <span className="absolute right-4 top-4 text-[#bdc2ff]">✓</span> : null}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
          isActive ? "bg-[#5e6ad2] text-white" : "bg-[#292a2e] text-[#c6c5d5]"
        }`}
      >
        {icon}
      </div>
      <div className="pr-6">
        <h4 className="text-base font-medium text-[#e3e2e7]">{title}</h4>
        <p className="mt-1 text-sm leading-5 text-[#c6c5d5]">{description}</p>
      </div>
    </button>
  );
}

function DraftPanel({ answers }: { answers: OnboardingAnswers }) {
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-[#454652] bg-[#121317] px-5 py-6 pb-14">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#454652] bg-[#1f1f24] font-mono text-[11px] text-[#bdc2ff]">
          ID
        </div>
        <h3 className="text-base font-medium text-[#e3e2e7]">你的交易画像草稿</h3>
      </div>

      <div className="space-y-3.5">
        <DraftItem label="交易品种" value={answers.marketScope} />
        <DraftItem label="交易周期" value={answers.timeframes.join(" / ")} />
        <DraftItem label="交易风格" value={answers.tradingStyle} />
        <DraftItem
          label="风险模式"
          value={`单笔 ${answers.maxRiskPerTradePercent}% · 每日 ${answers.maxDailyTradeCount} 次`}
        />
        <DraftItem label="常犯错误" value={answers.commonMistakes.join("、")} />
        <DraftItem label="偏好信号" value={answers.preferredSignals.join("、")} />

        <div className="space-y-3 pt-2">
          <InsightCard
            accent="#5e6ad2"
            label="潜在优势"
            text="规则边界清晰，适合先从少数品种沉淀可复盘样本。"
          />
          <InsightCard
            accent="#ffb4ab"
            label="主要风险"
            text={`${answers.commonMistakes.slice(0, 2).join("、")} 是当前体系优先拦截对象。`}
          />
          <div className="rounded-lg border border-l-4 border-white/10 border-l-[#ffb867] bg-[#1c1d25] p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffb867]">
              建议禁止事项
            </div>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-5 text-[#c6c5d5]">
              <li>止损后 60 分钟禁止交易</li>
              <li>无明确止损禁止交易</li>
              <li>每日止损 3 次后禁止交易</li>
              <li>禁止追单</li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DraftItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-4 text-[#908f9e]">{label}</p>
      <div className="inline-flex max-w-full rounded-md bg-[#292a2e] px-3 py-1.5">
        <span className="break-words font-mono text-xs leading-5 text-[#e3e2e7]">{value || "待选择"}</span>
      </div>
    </div>
  );
}

function InsightCard({ accent, label, text }: { accent: string; label: string; text: string }) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-[#1c1d25] p-3"
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
        {label}
      </p>
      <p className="text-xs leading-5 text-[#c6c5d5]">{text}</p>
    </div>
  );
}

function FinalSystemPreview({ answers }: { answers: OnboardingAnswers }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <SummaryCard label="核心范围" value={`${answers.marketScope} · ${answers.timeframes.join(" / ")}`} />
      <SummaryCard label="交易方法" value={answers.tradingStyle} />
      <SummaryCard
        label="风险约束"
        value={`单笔 ${answers.maxRiskPerTradePercent}% · 每日最多 ${answers.maxDailyTradeCount} 次`}
      />
      <SummaryCard label="禁止规则" value="止损冷静期、无止损禁入、禁止追单、每日止损上限" />
      <SummaryCard label="确认信号" value={answers.preferredSignals.join("、")} />
      <SummaryCard label="执行边界" value="辅助决策，不是投资建议；所有执行由用户最终确认。" />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1d25] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#908f9e]">{label}</p>
      <p className="mt-3 text-sm leading-6 text-[#e3e2e7]">{value}</p>
    </div>
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
