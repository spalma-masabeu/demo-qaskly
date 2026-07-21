import {
  PRESENTATION_THEMES,
  PresentationTheme,
  type ThemeDefinition,
} from "@qaskly/shared";
import type { CSSProperties } from "react";

export const PRESENTATION_THEME_OPTIONS = Object.values(PRESENTATION_THEMES);

export function getPresentationTheme(themeKey?: string): ThemeDefinition {
  if (
    themeKey &&
    Object.prototype.hasOwnProperty.call(PRESENTATION_THEMES, themeKey)
  ) {
    return PRESENTATION_THEMES[themeKey as PresentationTheme];
  }

  return PRESENTATION_THEMES[PresentationTheme.Classic];
}

export function getPresentationThemeVars(themeKey?: string) {
  const theme = getPresentationTheme(themeKey);
  return {
    "--presentation-bg": theme.background,
    "--presentation-fg": theme.foreground,
    "--presentation-accent": theme.accent,
  } as CSSProperties;
}
