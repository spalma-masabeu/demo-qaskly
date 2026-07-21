"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { IconButton } from "@/components/ui/icon-button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResultLog } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

interface ResultLogTableProps {
  presentationId: string;
  initialRows: ResultLog[];
  initialError?: string | null;
  refreshAction: () => Promise<ResultLog[]>;
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

export function ResultLogTable({
  presentationId,
  initialRows,
  initialError = null,
  refreshAction,
}: ResultLogTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const nextRows = await refreshAction();
        setRows(nextRows);
        setError(null);
      } catch {
        setError("No se pudieron cargar las sesiones históricas.");
      }
    });
  }

  if (isPending) {
    return <LoadingState label="Cargando sesiones…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudieron cargar los resultados"
        message={error}
        onRetry={refresh}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-7 w-7" aria-hidden="true" />}
        title="Sin sesiones aún"
        description="Cuando presentes esta actividad, sus resultados aparecerán aquí."
      />
    );
  }

  return (
    <Table aria-label="Sesiones históricas">
      <TableHeader>
        <TableRow>
          <TableHead>Participantes</TableHead>
          <TableHead>Respuestas</TableHead>
          <TableHead>Inicio</TableHead>
          <TableHead>Término</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead className="text-right">Ver</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows
          .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
          .map((row, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium text-gray-900">
              {row.participantCount}
            </TableCell>
            <TableCell>{row.responseCount}</TableCell>
            <TableCell>{formatDateTime(row.startedAt)}</TableCell>
            <TableCell>{formatDateTime(row.endedAt)}</TableCell>
            <TableCell>
              <Badge variant={COMPLETION_VARIANTS[row.completionState]}>
                {COMPLETION_LABELS[row.completionState]}
              </Badge>
            </TableCell>
            <TableCell>{formatEngagement(row.engagementRate)}</TableCell>
            <TableCell className="text-right">
              <IconButton
                aria-label={`Ver resultados de sesión ${formatDateTime(row.startedAt)}`}
                size="sm"
                variant="primary"
                onClick={() =>
                  router.push(
                    ROUTES.APP.RESULT_DETAIL(presentationId, row.sessionId)
                  )
                }
              >
                <Eye className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </TableCell>
          </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function formatDateTime(value: string): string {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatEngagement(value: number): string {
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}
