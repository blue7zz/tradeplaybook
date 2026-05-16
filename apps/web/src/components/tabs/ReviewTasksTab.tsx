import type { ReviewReport, TradeRecord } from "@tradeplaybook/shared";

interface ReviewTasksTabProps {
  records: TradeRecord[];
  report: ReviewReport;
  reports: ReviewReport[];
  onGenerateReview: (recordId: string) => void;
}

export function ReviewTasksTab({ records, report, reports, onGenerateReview }: ReviewTasksTabProps) {
  const reviewableRecords = records.filter((record) => record.status !== "reviewed").slice(0, 3);

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-4">
      <div className="grid gap-3">
        {report.reviewTasks.map((task, index) => (
          <div
            className="flex items-start gap-3 rounded-lg border border-line bg-[#fbfaf7] p-4"
            key={task}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-muted">{task}</p>
          </div>
        ))}
        {report.improvementSuggestions?.map((suggestion) => (
          <div className="rounded-lg border border-[#ecd289] bg-[#fffaf0] p-4" key={suggestion}>
            <strong className="text-sm text-ink">改进建议</strong>
            <p className="mt-2 text-sm leading-6 text-muted">{suggestion}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
          <h3 className="text-sm font-bold text-ink">待复盘记录</h3>
          <div className="mt-3 grid gap-3">
            {reviewableRecords.length > 0 ? (
              reviewableRecords.map((record) => (
                <div className="rounded-md border border-line bg-white p-3" key={record.id}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-ink">{record.symbol}</strong>
                    <button
                      className="rounded-md bg-ink px-3 py-2 text-xs font-bold text-white"
                      onClick={() => onGenerateReview(record.id)}
                      type="button"
                    >
                      生成复盘
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {record.followedPlan ? "遵守计划" : "偏离计划"} ·{" "}
                    {record.resultR === undefined ? "0R" : `${record.resultR > 0 ? "+" : ""}${record.resultR}R`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted">暂无待复盘记录。可以先确认一条计划生成 mock 交易记录。</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
          <h3 className="text-sm font-bold text-ink">复盘报告</h3>
          <div className="mt-3 grid gap-2">
            {reports.slice(0, 4).map((item) => (
              <div className="rounded-md border border-line bg-white p-3" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-ink">{item.light.toUpperCase()}</strong>
                  <span className="text-xs text-muted">{item.reviewedAt.slice(0, 10)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
