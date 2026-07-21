export enum PresentationTheme {
  Classic = "CLASSIC",
  Dark = "DARK",
  Playful = "PLAYFUL",
  Minimal = "MINIMAL"
}

export interface ThemeDefinition {
  key: PresentationTheme;
  label: string;
  background: string;
  foreground: string;
  accent: string;
}

export const PRESENTATION_THEMES: Record<
  PresentationTheme,
  ThemeDefinition
> = {
  [PresentationTheme.Classic]: {
    key: PresentationTheme.Classic,
    label: "Classic",
    background: "#ffffff",
    foreground: "#111827",
    accent: "#2563eb"
  },
  [PresentationTheme.Dark]: {
    key: PresentationTheme.Dark,
    label: "Dark",
    background: "#111827",
    foreground: "#f9fafb",
    accent: "#38bdf8"
  },
  [PresentationTheme.Playful]: {
    key: PresentationTheme.Playful,
    label: "Playful",
    background: "#fef3c7",
    foreground: "#3f3f46",
    accent: "#c2410c"
  },
  [PresentationTheme.Minimal]: {
    key: PresentationTheme.Minimal,
    label: "Minimal",
    background: "#f8fafc",
    foreground: "#0f172a",
    accent: "#047857"
  }
};
