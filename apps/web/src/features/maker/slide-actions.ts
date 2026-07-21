"use server";

import { getApiAccessToken } from "@/lib/auth/access-token";
import { createSlide, updateSlide, deleteSlide } from "@/lib/api/slides";
import { SlideType, isApiError, type SlideViewModel, type SlideConfig } from "@/lib/api/types";
import { refreshAfterSlidesChange } from "@/lib/cache/protected-view-cache";

export async function createSlideAction(
  presentationId: string,
  type: SlideType
): Promise<{ slide?: SlideViewModel; error?: string }> {
  try {
    const token = await getApiAccessToken();
    const defaultConfig = getDefaultConfig(type);
    const slide = await createSlide(
      presentationId,
      { type, prompt: "Nueva pregunta", config: defaultConfig },
      token
    );
    refreshAfterSlidesChange(presentationId);
    return { slide };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo crear la diapositiva." };
  }
}

export async function updateSlideAction(
  presentationId: string,
  slideId: string,
  payload: { prompt: string; title?: string; config: SlideConfig }
): Promise<{ slide?: SlideViewModel; error?: string }> {
  try {
    const token = await getApiAccessToken();
    const slide = await updateSlide(slideId, payload, token);
    refreshAfterSlidesChange(presentationId);
    return { slide };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo guardar la diapositiva." };
  }
}

export async function deleteSlideAction(
  presentationId: string,
  slideId: string
): Promise<{ error?: string }> {
  try {
    const token = await getApiAccessToken();
    await deleteSlide(slideId, token);
    refreshAfterSlidesChange(presentationId);
    return {};
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo eliminar la diapositiva." };
  }
}

function getDefaultConfig(type: SlideType): SlideConfig {
  switch (type) {
    case SlideType.MultipleChoice:
      return {
        options: [
          { id: "opt-1", label: "Opción 1" },
          { id: "opt-2", label: "Opción 2" },
          { id: "opt-3", label: "Opción 3" },
        ],
        allowMultiple: false,
      };
    case SlideType.OpenEnded:
      return { maxLength: 200 };
    case SlideType.WordCloud:
      return { inputCount: 1, maxWordLength: 20 };
    case SlideType.Scales:
      return { min: 1, max: 5, minLabel: "Mínimo", maxLabel: "Máximo" };
    case SlideType.Ranking:
      return {
        items: [
          { id: "item-1", label: "Elemento 1" },
          { id: "item-2", label: "Elemento 2" },
          { id: "item-3", label: "Elemento 3" },
        ],
      };
    case SlideType.GuessTheNumber:
      return { min: 0, max: 100 };
    case SlideType.TwoByTwo:
      return {
        xMin: -5,
        xMax: 5,
        yMin: -5,
        yMax: 5,
        xMinLabel: "Izquierda",
        xMaxLabel: "Derecha",
        yMinLabel: "Abajo",
        yMaxLabel: "Arriba",
      };
    default:
      return {} as SlideConfig;
  }
}
