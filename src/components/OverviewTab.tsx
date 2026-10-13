import { formatEurRounded } from "../lib/format";
import type { Insight, Overview } from "../types";
import { CategoryBars } from "./CategoryBars";
import { InsightsList } from "./InsightsList";
import { Kpi } from "./Kpi";
import { MonthlyChart } from "./MonthlyChart";
import { WhatIf } from "./WhatIf";

interface OverviewTabProps {
  overview: Overview;
  onSelectCategory: (category: string) => void;
  onReviewInsight: (insight: Insight) => void;
}

export function OverviewTab({
  overview,
  onSelectCategory,
  onReviewInsight,
}: OverviewTabProps) {
  return (
    <>
      <section className="kpis" aria-label="Summary">
        <Kpi label="Income" value={formatEurRounded(overview.income)} />
        <Kpi label="Spending" value={formatEurRounded(overview.spending)} />
        <Kpi label="Net" value={formatEurRounded(overview.net)} />
        <Kpi label="Savings rate" value={`${overview.savingsRate}%`} />
      </section>
      <section className="card">
        <MonthlyChart data={overview.byMonth} />
      </section>
      <InsightsList insights={overview.insights} onReview={onReviewInsight} />
      <CategoryBars
        categories={overview.byCategory}
        onSelect={onSelectCategory}
      />
      <WhatIf overview={overview} />
    </>
  );
}
