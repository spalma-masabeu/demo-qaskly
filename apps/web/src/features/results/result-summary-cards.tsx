import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ResultLog } from "@/lib/api/types";

interface ResultSummaryCardsProps {
  summary: ResultLog;
}

const COMPLETION_LABELS: Record<ResultLog["completionState"], string> = {
  completed: "Completada",
  incomplete: "Incompleta",
};

const COMPLETION_VARIANTS: Record<
  ResultLog["completionState"],
  "success" | "warning"
> = {
  completed: "success",
  incomplete: "warning",
};

export function ResultSummaryCards({ summary }: ResultSummaryCardsProps) {
  return (
    <section
      aria-label="Resumen de resultados"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <SummaryCard label="Participantes" value={summary.participantCount} />
      <SummaryCard label="Respuestas" value={summary.responseCount} />
      <SummaryCard
        label="Engagement"
        value={`${Math.round(
          summary.engagementRate <= 1
            ? summary.engagementRate * 100
            : summary.engagementRate
        )}%`}
      />
      <Card className="p-4">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Estado
        </p>
        <div className="mt-3">
          <Badge variant={COMPLETION_VARIANTS[summary.completionState]}>
            {COMPLETION_LABELS[summary.completionState]}
          </Badge>
        </div>
      </Card>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </Card>
  );
}
