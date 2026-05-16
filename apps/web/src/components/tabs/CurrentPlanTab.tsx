import type { PlanReview, TradePlan } from "@tradeplaybook/shared";

interface CurrentPlanTabProps {
  plan: TradePlan | null;
  review: PlanReview;
  onAbandonPlan: () => void;
  onConfirmPlan: () => void;
}

export function CurrentPlanTab({ plan, review, onAbandonPlan, onConfirmPlan }: CurrentPlanTabProps) {
  if (!plan) {
    return (
      <div className="rounded-lg border border-[#efbbb6] bg-[#fff7f6] p-5">
        <h3 className="text-base font-bold text-danger">当前没有可执行计划</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{review.summary}</p>
        <div className="mt-4 grid gap-3">
          {review.findings.map((finding) => (
            <div className="rounded-md border border-[#efbbb6] bg-white p-3" key={finding.id}>
              <strong className="text-sm text-ink">{finding.title}</strong>
              <p className="mt-1 text-sm leading-6 text-muted">{finding.message}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isConfirmed = plan.planStatus === "confirmed";
  const isBlocked = plan.light === "red" || plan.planStatus === "blocked";

  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="方向" value={formatDirection(plan.direction)} />
        <Metric label="状态" value={plan.planStatus.toUpperCase()} />
        <Metric label="确认状态" value={plan.confirmationStatus ?? "pending"} />
        <Metric label="入场" value={String(plan.entryPrice)} />
        <Metric label="止损" value={String(plan.stopLossPrice)} />
        <Metric label="止盈" value={String(plan.takeProfitPrice)} />
        <Metric label="风险收益比" value={`1:${plan.riskRewardRatio}`} />
      </div>

      <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
        <h3 className="text-sm font-bold text-ink">计划说明</h3>
        <div className="mt-3 space-y-2">
          {plan.rationale.map((item) => (
            <p className="text-sm leading-6 text-muted" key={item}>
              {item}
            </p>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-[#c9e6da] bg-[#eef8f3] p-3">
          <p className="text-sm font-bold text-success">{review.summary}</p>
          <p className="mt-2 text-sm text-muted">{plan.invalidationCondition}</p>
        </div>
        <div className="mt-4 grid gap-2 rounded-md border border-line bg-white p-3">
          <p className="text-sm font-bold text-ink">执行前检查</p>
          {(plan.executionChecklist ?? ["确认入场、止损、止盈。", "用户最终确认后才允许执行。"]).map(
            (item) => (
              <p className="text-sm leading-6 text-muted" key={item}>
                {item}
              </p>
            )
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-muted hover:border-danger hover:text-danger"
            onClick={onAbandonPlan}
            type="button"
          >
            放弃计划
          </button>
          <button
            className="rounded-md bg-ink px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-muted"
            disabled={isConfirmed || isBlocked}
            onClick={onConfirmPlan}
            type="button"
          >
            {isConfirmed ? "已确认并记录" : "用户确认并生成记录"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          TradePlaybook AI 不会自动下单。确认按钮只生成前端 mock 交易记录；所有内容仅用于辅助决策，不是投资建议。
        </p>
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function formatDirection(direction: TradePlan["direction"]) {
  if (direction === "long") {
    return "做多";
  }

  if (direction === "short") {
    return "做空";
  }

  return "观察";
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg border border-line bg-[#fbfaf7] p-4">
      <span className="text-xs text-muted">{label}</span>
      <strong className="mt-2 block text-lg text-ink">{value}</strong>
    </div>
  );
}
