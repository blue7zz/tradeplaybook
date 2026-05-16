import type { RuleSuggestion, TradingSystem } from "@tradeplaybook/shared";

interface RulesTabProps {
  ruleSuggestions: RuleSuggestion[];
  tradingSystem: TradingSystem;
  onAcceptRuleSuggestion: (suggestionId: string) => void;
}

export function RulesTab({
  ruleSuggestions,
  tradingSystem,
  onAcceptRuleSuggestion
}: RulesTabProps) {
  const rules = [...tradingSystem.rules, ...tradingSystem.forbiddenRules];

  return (
    <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
      <div className="grid grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            className={`rounded-lg border p-4 ${
              rule.severity === "core"
                ? "border-[#efbbb6] bg-[#fff7f6]"
                : "border-[#ecd289] bg-[#fffaf0]"
            }`}
            key={rule.id}
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-ink">{rule.title}</strong>
              <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold uppercase text-muted">
                {rule.severity}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{rule.description}</p>
            <p className="mt-3 text-xs font-bold text-muted">
              {rule.canBeTemporarilyBypassed ? "可在体系调整时讨论" : "不能临时绕过"}
            </p>
          </div>
        ))}
      </div>

      <aside className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">规则建议</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          建议必须由用户确认后才会进入规则库。核心禁止规则不能被临时绕过。
        </p>
        <div className="mt-4 grid gap-3">
          {ruleSuggestions.length > 0 ? (
            ruleSuggestions.map((suggestion) => (
              <div className="rounded-md border border-line bg-white p-3" key={suggestion.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-ink">{suggestion.title}</strong>
                  <span className="rounded-md bg-[#fbfaf7] px-2 py-1 text-xs font-bold uppercase text-muted">
                    {suggestion.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{suggestion.description}</p>
                {suggestion.status === "pending" ? (
                  <button
                    className="mt-3 rounded-md bg-ink px-3 py-2 text-xs font-bold text-white"
                    onClick={() => onAcceptRuleSuggestion(suggestion.id)}
                    type="button"
                  >
                    用户确认写入
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-muted">暂无待确认规则建议。</p>
          )}
        </div>
      </aside>
    </div>
  );
}
