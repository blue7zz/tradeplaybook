"use client";

import type { AssistantMessage, PlanReview } from "@tradeplaybook/shared";
import type { FormEvent } from "react";
import { useState } from "react";

interface AiChatPanelProps {
  isBusy?: boolean;
  messages: AssistantMessage[];
  review: PlanReview;
  onSubmitIdea: (idea: string) => void;
}

export function AiChatPanel({ isBusy = false, messages, review, onSubmitIdea }: AiChatPanelProps) {
  const [idea, setIdea] = useState("");
  const isRed = review.light === "red";
  const isYellow = review.light === "yellow";
  const ma30BacktestDemoText = "站上 30 均线买入，站下 30 均线卖出，帮我回测最近 90 天";
  const recordDemoText = "记录这笔交易";
  const reviewDemoText = "复盘最近一笔交易";
  const ruleDemoText = "接受规则建议写入规则库";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedIdea = idea.trim();

    if (!trimmedIdea) {
      return;
    }

    onSubmitIdea(trimmedIdea);
    setIdea("");
  }

  return (
    <aside
      aria-label="AI 交流窗口"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-panel"
    >
      <div className="shrink-0 border-b border-line px-5 py-4">
        <p className="text-xs font-bold uppercase text-muted">AI 交流窗口</p>
        <h2 className="mt-1 text-xl font-bold text-ink">交易纪律助手</h2>
      </div>

      <div
        className={`shrink-0 border-b px-5 py-4 ${
          isRed
            ? "border-[#efbbb6] bg-[#fff7f6]"
            : isYellow
              ? "border-[#ecd289] bg-[#fffaf0]"
              : "border-line bg-[#eef8f3]"
        }`}
      >
        <p
          className={`text-sm font-bold ${
            isRed ? "text-danger" : isYellow ? "text-warning" : "text-success"
          }`}
        >
          {review.summary}
        </p>
        <p className="mt-2 text-xs text-muted">
          {review.finalConfirmationRequired ? "所有执行动作都需要用户最终确认。" : "红灯状态下不能生成执行计划。"}
        </p>
      </div>

      <div aria-label="AI 消息列表" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((message) => (
          <div
            className={`max-w-[92%] rounded-lg border px-3 py-3 ${
              message.role === "user"
                ? "ml-auto border-[#ddd6c8] bg-[#fbfaf7]"
                : "mr-auto border-[#cfe0e8] bg-[#f1f7fa]"
            }`}
            key={message.id}
          >
            <span className="text-xs font-bold text-muted">
              {message.role === "user" ? "用户" : "AI"}
            </span>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{message.content}</p>
          </div>
        ))}
      </div>

      <form className="shrink-0 border-t border-line p-4" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="trade-idea">
          输入交易想法
        </label>
        <textarea
          className="h-24 w-full resize-none rounded-lg border border-line bg-[#fbfaf7] px-3 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink"
          id="trade-idea"
          onChange={(event) => setIdea(event.target.value)}
          placeholder="输入交易想法，例如：BTC 回调到支撑后想做多"
          value={idea}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Demo 规则：上涨趋势中输入“做空”会触发红灯。</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="rounded-md border border-line bg-[#fbfaf7] px-3 py-2 text-sm font-bold text-muted hover:border-ink hover:text-ink"
              onClick={() => onSubmitIdea(ma30BacktestDemoText)}
              type="button"
            >
              MA30 回测示例
            </button>
            <button
              className="rounded-md border border-line bg-[#fbfaf7] px-3 py-2 text-sm font-bold text-muted hover:border-ink hover:text-ink"
              onClick={() => onSubmitIdea(recordDemoText)}
              type="button"
            >
              记录
            </button>
            <button
              className="rounded-md border border-line bg-[#fbfaf7] px-3 py-2 text-sm font-bold text-muted hover:border-ink hover:text-ink"
              onClick={() => onSubmitIdea(reviewDemoText)}
              type="button"
            >
              复盘
            </button>
            <button
              className="rounded-md border border-line bg-[#fbfaf7] px-3 py-2 text-sm font-bold text-muted hover:border-ink hover:text-ink"
              onClick={() => onSubmitIdea(ruleDemoText)}
              type="button"
            >
              采纳规则
            </button>
            <button
              className="rounded-md bg-ink px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-muted"
              disabled={!idea.trim() || isBusy}
              type="submit"
            >
              {isBusy ? "处理中" : "审核想法"}
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
