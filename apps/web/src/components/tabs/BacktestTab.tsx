import type { BacktestResult } from "@tradeplaybook/shared";

interface BacktestTabProps {
  result: BacktestResult;
}

export function BacktestTab({ result }: BacktestTabProps) {
  const stats = [
    { label: "策略名称", value: result.strategyName },
    { label: "回测周期", value: `${result.period.from} 至 ${result.period.to}` },
    { label: "交易次数", value: `${result.tradeCount} 次` },
    { label: "胜率", value: `${result.winRatePercent}%` },
    { label: "总收益", value: `${result.totalReturnPercent}%` },
    { label: "最大回撤", value: `${result.maxDrawdownPercent}%` },
    { label: "平均盈利", value: `${result.averageWinPercent ?? 0}%` },
    { label: "平均亏损", value: `${result.averageLossPercent ?? 0}%` },
    { label: "连续亏损次数", value: `${result.maxConsecutiveLosses} 次` }
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div className="rounded-lg border border-line bg-[#fbfaf7] p-4" key={stat.label}>
            <span className="text-xs text-muted">{stat.label}</span>
            <strong className="mt-2 block text-lg text-ink">{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">AI 总结</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{result.aiSummary}</p>
        <div className="mt-4 rounded-md border border-[#ecd289] bg-[#fffaf0] p-3">
          {result.limitations.map((item) => (
            <p className="text-sm leading-6 text-muted" key={item}>
              {item}
            </p>
          ))}
          <p className="mt-2 text-sm font-bold text-muted">
            回测结果仅用于辅助决策，不是投资建议，不代表未来收益。
          </p>
        </div>
      </div>
    </div>
  );
}
