import type { TradeRecord } from "@tradeplaybook/shared";

interface TradeHistoryTabProps {
  records: TradeRecord[];
}

export function TradeHistoryTab({ records }: TradeHistoryTabProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="grid grid-cols-7 bg-[#fbfaf7] px-4 py-3 text-xs font-bold uppercase text-muted">
        <span>编号</span>
        <span>标的</span>
        <span>方向</span>
        <span>结果</span>
        <span>状态</span>
        <span>计划执行</span>
        <span>标签</span>
      </div>
      {records.map((record) => (
        <div
          className="grid grid-cols-7 border-t border-line px-4 py-3 text-sm text-ink"
          key={record.id}
        >
          <span>{record.id}</span>
          <span>{record.symbol}</span>
          <span>{record.direction === "long" ? "做多" : record.direction === "short" ? "做空" : "观察"}</span>
          <span>{record.resultR === undefined ? "0R" : `${record.resultR > 0 ? "+" : ""}${record.resultR}R`}</span>
          <span>{record.status}</span>
          <span>{record.followedPlan ? "遵守计划" : "偏离计划"}</span>
          <span className="truncate text-muted">{record.mistakeTags?.join(" / ") ?? "未标记"}</span>
        </div>
      ))}
    </div>
  );
}
