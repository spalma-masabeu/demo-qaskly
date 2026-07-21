export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  JOIN: (code: string) => `/join/${code}`,

  // Auth0 SDK v4 routes, mounted by middleware (see src/middleware.ts).
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    CALLBACK: "/auth/callback",
  },

  APP: {
    HOME: "/app",
    PRESENTATIONS: "/app/presentations",
    MAKER: (id: string) => `/app/presentations/${id}/maker`,
    LIVE: (id: string) => `/app/presentations/${id}/live`,
    RESULTS: (id: string) => `/app/presentations/${id}/results`,
    RESULT_DETAIL: (id: string, sessionId: string) =>
      `/app/presentations/${id}/results/${sessionId}`,
    SETTINGS: "/app/settings",
  },
} as const;

export const PROTECTED_VIEW_ROUTES = {
  INCLUDED: {
    HOME: ROUTES.APP.HOME,
    PRESENTATIONS: ROUTES.APP.PRESENTATIONS,
    MAKER: ROUTES.APP.MAKER,
    RESULTS: ROUTES.APP.RESULTS,
    RESULT_DETAIL: ROUTES.APP.RESULT_DETAIL,
  },
  EXCLUDED_LIVE: {
    PRESENTER_LIVE: ROUTES.APP.LIVE,
    AUDIENCE_ROOM: ROUTES.JOIN,
  },
} as const;
