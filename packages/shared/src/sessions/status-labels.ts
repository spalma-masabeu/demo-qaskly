export type SessionStatus = "waiting" | "active" | "closed" | "ended";

export function presenterStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "waiting":
      return "En espera";
    case "active":
      return "En vivo";
    case "closed":
      return "Respuestas cerradas";
    case "ended":
      return "Finalizada";
  }
}

export function audienceStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "waiting":
      return "En espera";
    case "active":
      return "En vivo";
    case "closed":
      return "Respuestas cerradas";
    case "ended":
      return "Finalizada";
  }
}

export function exportedStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "waiting":
      return "En espera";
    case "active":
      return "En vivo";
    case "closed":
      return "Respuestas cerradas";
    case "ended":
      return "Finalizada";
  }
}
