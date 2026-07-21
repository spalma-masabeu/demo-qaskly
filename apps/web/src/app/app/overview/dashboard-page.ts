interface CountRow {
  total: number;
}

export interface DashboardDatabase {
  query<T>(sql: string): Promise<T[]>;
}

export interface DashboardView {
  heading: string;
  metrics: Array<{ label: string; value: number }>;
}

export async function renderDashboardPage(
  database: DashboardDatabase
): Promise<DashboardView> {
  const [presentations] = await database.query<CountRow>(
    "SELECT COUNT(*) AS total FROM presentations"
  );
  const [liveSessions] = await database.query<CountRow>(
    "SELECT COUNT(*) AS total FROM live_sessions WHERE status = 'ACTIVE'"
  );

  return {
    heading: "Resumen operativo",
    metrics: [
      { label: "Presentaciones", value: presentations.total },
      { label: "Sesiones activas", value: liveSessions.total },
    ],
  };
}
