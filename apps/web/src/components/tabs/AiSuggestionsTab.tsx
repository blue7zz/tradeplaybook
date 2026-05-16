import type { AiSuggestion } from "@tradeplaybook/shared";

interface AiSuggestionsTabProps {
  suggestions: AiSuggestion[];
}

export function AiSuggestionsTab({ suggestions }: AiSuggestionsTabProps) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-5">
        <h3 className="text-base font-bold text-ink">暂无 AI 建议</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          当系统完成计划审核、回测或复盘后，会在这里沉淀可处理的建议。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {suggestions.map((suggestion) => (
        <article
          className={`rounded-lg border p-4 ${
            suggestion.priority === "high"
              ? "border-[#efbbb6] bg-[#fff7f6]"
              : "border-line bg-[#fbfaf7]"
          }`}
          key={suggestion.id}
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-ink">{suggestion.title}</strong>
            <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold uppercase text-muted">
              {suggestion.source}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{suggestion.message}</p>
          <p className="mt-3 text-xs text-muted">
            状态：{suggestion.resolved ? "已处理" : "待处理"} · 优先级：{suggestion.priority}
          </p>
        </article>
      ))}
    </div>
  );
}
