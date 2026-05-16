import type { SignalDefinition, TradingSystem } from "@tradeplaybook/shared";

interface TradingSystemTabProps {
  signalDefinitions: SignalDefinition[];
  tradingSystem: TradingSystem;
}

export function TradingSystemTab({ signalDefinitions, tradingSystem }: TradingSystemTabProps) {
  return (
    <div className="grid grid-cols-[0.8fr_1.2fr] gap-4">
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">{tradingSystem.name}</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <Row label="市场" value={tradingSystem.marketScope} />
          <Row label="周期" value={tradingSystem.timeframes.join(" / ")} />
          <Row label="单笔风险" value={`${tradingSystem.maxRiskPerTradePercent}%`} />
          <Row label="日亏损上限" value={`${tradingSystem.maxDailyLossPercent}%`} />
          <Row label="每日最多交易" value={`${tradingSystem.maxDailyTradeCount} 次`} />
          <Row label="版本" value={tradingSystem.version} />
        </dl>
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">体系执行规则</h3>
        <div className="mt-3 grid gap-3">
          {tradingSystem.rules.map((rule) => (
            <div className="rounded-md border border-line bg-white p-3" key={rule.id}>
              <strong className="text-sm text-ink">{rule.title}</strong>
              <p className="mt-1 text-sm leading-6 text-muted">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">仓位规则</h3>
        {tradingSystem.positionSizingRule ? (
          <div className="mt-3 grid gap-3 text-sm">
            <Row label="规则" value={tradingSystem.positionSizingRule.title} />
            <Row label="单笔风险" value={`${tradingSystem.positionSizingRule.riskPerTradePercent}%`} />
            <Row label="日亏损上限" value={`${tradingSystem.positionSizingRule.maxDailyLossPercent}%`} />
            <p className="rounded-md border border-line bg-white p-3 leading-6 text-muted">
              {tradingSystem.positionSizingRule.afterLossAdjustment}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">暂无仓位规则。</p>
        )}
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">信号定义</h3>
        <div className="mt-3 grid gap-3">
          {signalDefinitions.map((signal) => (
            <div className="rounded-md border border-line bg-white p-3" key={signal.id}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-ink">{signal.name}</strong>
                <span className="rounded-md bg-[#fbfaf7] px-2 py-1 text-xs font-bold text-muted">
                  {signal.timeframe}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {signal.triggerConditions.join("；")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">常犯错误</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {tradingSystem.commonMistakes.map((mistake) => (
            <span className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-muted" key={mistake}>
              {mistake}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">偏好信号</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {tradingSystem.preferredSignals.map((signal) => (
            <span className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-muted" key={signal}>
              {signal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
