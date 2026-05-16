import type { PeriodReport, PlanReview, TradingSystem, UserProfile } from "@tradeplaybook/shared";

interface PersonalStatusTabProps {
  periodReports: PeriodReport[];
  profile: UserProfile;
  review: PlanReview;
  tradingSystem: TradingSystem;
}

export function PersonalStatusTab({
  periodReports,
  profile,
  review,
  tradingSystem
}: PersonalStatusTabProps) {
  const latestReport = periodReports[0];

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatusCard label="交易者" value={profile.displayName} />
      <StatusCard label="风格" value={profile.tradingStyle} />
      <StatusCard label="风险模式" value={profile.riskMode} />
      <StatusCard label="当前纪律灯" value={review.light.toUpperCase()} tone={review.light} />
      <div className="col-span-4 rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">今日约束</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          单笔风险不超过 {tradingSystem.maxRiskPerTradePercent}%，日亏损上限{" "}
          {tradingSystem.maxDailyLossPercent}%。任何计划都必须由用户最终确认后才可执行。
        </p>
      </div>
      {latestReport ? (
        <div className="col-span-4 rounded-lg border border-line bg-[#fbfaf7] p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-ink">最近周期报告</h3>
            <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold uppercase text-muted">
              {latestReport.type}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{latestReport.aiSummary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {latestReport.nextActions.map((action) => (
              <span
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-muted"
                key={action}
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface StatusCardProps {
  label: string;
  value: string;
  tone?: "default" | "green" | "yellow" | "red";
}

function StatusCard({ label, value, tone = "default" }: StatusCardProps) {
  const toneClass = {
    default: "text-ink",
    green: "text-success",
    yellow: "text-warning",
    red: "text-danger"
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
      <span className="text-xs text-muted">{label}</span>
      <strong className={`mt-2 block text-lg ${toneClass}`}>{value}</strong>
    </div>
  );
}
