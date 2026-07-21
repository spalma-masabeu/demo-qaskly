import { type ComponentType, type ReactNode } from "react";
import {
  AlignLeft,
  ChartScatter,
  Cloud,
  CircleCheckBig,
  Hash,
  ListOrdered,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { SlideType } from "@qaskly/shared";
import { SUPPORTED_SLIDE_TYPES } from "@/lib/api/types";
import type {
  SlideViewModel,
  SlideResult,
  MultipleChoiceConfig,
  WordCloudConfig,
  OpenEndedConfig,
  ScalesConfig,
} from "@/lib/api/types";

// ---------- Slot prop types ----------

export interface EditorFormProps<TConfig = unknown> {
  slide: SlideViewModel;
  config: TConfig;
  onChange: (config: TConfig) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export interface PreviewProps {
  slide: SlideViewModel;
}

export interface ParticipantFormProps<TConfig = unknown> {
  slide: SlideViewModel;
  config: TConfig;
  onSubmit: (response: unknown) => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface ResultDisplayProps {
  slide: SlideViewModel;
  result: SlideResult;
  variant?: "compact" | "immersive";
  phase?: "active" | "closed";
}

// ---------- Registry entry ----------

export interface SlideRegistryEntry {
  type: SlideType;
  label: string;
  Icon: LucideIcon;
  tint: string;
  isSupportedInFirstSlice: boolean;
  EditorForm: ComponentType<EditorFormProps> | null;
  Preview: ComponentType<PreviewProps> | null;
  ParticipantForm: ComponentType<ParticipantFormProps> | null;
  ResultDisplay: ComponentType<ResultDisplayProps> | null;
}

// ---------- Registry ----------

export type SlideRegistry = Record<SlideType, SlideRegistryEntry>;

const SLIDE_LABELS: Record<SlideType, string> = {
  [SlideType.MultipleChoice]: "Opción múltiple",
  [SlideType.WordCloud]: "Nube de palabras",
  [SlideType.OpenEnded]: "Respuesta abierta",
  [SlideType.Scales]: "Escala",
  [SlideType.Ranking]: "Ranking",
  [SlideType.GuessTheNumber]: "Adivina el número",
  [SlideType.TwoByTwo]: "Matriz 2x2",
};

const SLIDE_ICONS: Record<SlideType, LucideIcon> = {
  [SlideType.MultipleChoice]: CircleCheckBig,
  [SlideType.WordCloud]: Cloud,
  [SlideType.OpenEnded]: AlignLeft,
  [SlideType.Scales]: SlidersHorizontal,
  [SlideType.Ranking]: ListOrdered,
  [SlideType.GuessTheNumber]: Hash,
  [SlideType.TwoByTwo]: ChartScatter,
};

const SLIDE_TINTS: Record<SlideType, string> = {
  [SlideType.MultipleChoice]: "bg-brand-purple-100 text-brand-purple-700",
  [SlideType.WordCloud]: "bg-brand-purple-100 text-brand-purple-700",
  [SlideType.OpenEnded]: "bg-brand-blue-100 text-brand-blue-700",
  [SlideType.Scales]: "bg-brand-blue-100 text-brand-blue-700",
  [SlideType.Ranking]: "bg-brand-purple-100 text-brand-purple-700",
  [SlideType.GuessTheNumber]: "bg-brand-blue-100 text-brand-blue-700",
  [SlideType.TwoByTwo]: "bg-brand-purple-100 text-brand-purple-700",
};

function makeEntry(type: SlideType): SlideRegistryEntry {
  return {
    type,
    label: SLIDE_LABELS[type],
    Icon: SLIDE_ICONS[type],
    tint: SLIDE_TINTS[type],
    isSupportedInFirstSlice: SUPPORTED_SLIDE_TYPES.has(type),
    EditorForm: null,
    Preview: null,
    ParticipantForm: null,
    ResultDisplay: null,
  };
}

export const slideRegistry: SlideRegistry = {
  [SlideType.MultipleChoice]: makeEntry(SlideType.MultipleChoice),
  [SlideType.WordCloud]: makeEntry(SlideType.WordCloud),
  [SlideType.OpenEnded]: makeEntry(SlideType.OpenEnded),
  [SlideType.Scales]: makeEntry(SlideType.Scales),
  [SlideType.Ranking]: makeEntry(SlideType.Ranking),
  [SlideType.GuessTheNumber]: makeEntry(SlideType.GuessTheNumber),
  [SlideType.TwoByTwo]: makeEntry(SlideType.TwoByTwo),
};

// ---------- Registry accessors ----------

export function getSlideEntry(type: SlideType): SlideRegistryEntry {
  return slideRegistry[type];
}

export function getSupportedSlideTypes(): SlideType[] {
  return Object.values(SlideType).filter((t) => SUPPORTED_SLIDE_TYPES.has(t));
}

export function registerSlideComponents(
  type: SlideType,
  components: Partial<
    Pick<
      SlideRegistryEntry,
      "EditorForm" | "Preview" | "ParticipantForm" | "ResultDisplay"
    >
  >
): void {
  Object.assign(slideRegistry[type], components);
}

// ---------- Unsupported placeholder ----------

export function UnsupportedSlide({
  slide,
}: {
  slide: SlideViewModel;
}): ReactNode {
  const entry = getSlideEntry(slide.type);
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-10 text-center">
      <p className="text-base font-medium text-gray-500">{entry.label}</p>
      <p className="mt-1 text-sm text-gray-400">
        Disponible en una próxima versión
      </p>
    </div>
  );
}
