import {
  type GuessTheNumberConfig,
  type MultipleChoiceConfig,
  type OpenEndedConfig,
  type RankingConfig,
  type ScalesConfig,
  type SlideConfigByType,
  type TwoByTwoConfig,
  type WordCloudConfig
} from "./configs";
import {
  type SlideResponseByType
} from "./responses";
import { SlideType } from "./types";
import {
  isAlignedToStep,
  isFiniteNumber,
  isNonEmptyString,
  isStringArray,
  requireObjectWithKeys
} from "./validation-utils";

export function isValidSlideResponse<T extends SlideType>(
  type: T,
  config: SlideConfigByType[T],
  response: unknown
): response is SlideResponseByType[T] {
  return getSlideResponseValidationErrors(type, config, response).length === 0;
}

export function getSlideResponseValidationErrors<T extends SlideType>(
  type: T,
  config: SlideConfigByType[T],
  response: unknown
): string[] {
  switch (type) {
    case SlideType.MultipleChoice:
      return validateMultipleChoiceResponse(
        config as MultipleChoiceConfig,
        response
      );
    case SlideType.WordCloud:
      return validateWordCloudResponse(config as WordCloudConfig, response);
    case SlideType.OpenEnded:
      return validateTextResponse(config as OpenEndedConfig, response, "text");
    case SlideType.Scales:
      return validateScalesResponse(config as ScalesConfig, response);
    case SlideType.Ranking:
      return validateRankingResponse(config as RankingConfig, response);
    case SlideType.GuessTheNumber:
      return validateGuessTheNumberResponse(
        config as GuessTheNumberConfig,
        response
      );
    case SlideType.TwoByTwo:
      return validateTwoByTwoResponse(config as TwoByTwoConfig, response);
  }
}

function validateMultipleChoiceResponse(
  config: MultipleChoiceConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["selectedOptionIds"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  const selectedOptionIds = record.selectedOptionIds;
  const validIds = new Set(config.options.map((option) => option.id));
  if (!isStringArray(selectedOptionIds)) {
    errors.push("selectedOptionIds must be an array of strings");
  } else {
    if (selectedOptionIds.length < 1) {
      errors.push("selectedOptionIds must include at least one option");
    }
    if (!config.allowMultiple && selectedOptionIds.length !== 1) {
      errors.push("selectedOptionIds must include exactly one option");
    }
    if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
      errors.push("selectedOptionIds must not contain duplicates");
    }
    if (selectedOptionIds.some((id) => !validIds.has(id))) {
      errors.push("selectedOptionIds contains an unknown option id");
    }
  }
  return errors;
}

function validateWordCloudResponse(
  config: WordCloudConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["words"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  const words = record.words;
  if (!isStringArray(words)) {
    errors.push("words must be an array of strings");
  } else {
    if (words.length < 1 || words.length > config.inputCount) {
      errors.push(`words must include between 1 and ${config.inputCount} items`);
    }
    for (const word of words) {
      if (!isNonEmptyString(word, config.maxWordLength)) {
        errors.push(
          `each word must be non-empty and up to ${config.maxWordLength} characters`
        );
        break;
      }
    }
  }
  return errors;
}

function validateTextResponse(
  config: OpenEndedConfig,
  response: unknown,
  field: "text"
): string[] {
  const errors = requireObjectWithKeys(response, [field]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  if (!isNonEmptyString(record[field], config.maxLength)) {
    errors.push(
      `${field} must be a non-empty string up to ${config.maxLength} characters`
    );
  }
  return errors;
}

function validateScalesResponse(
  config: ScalesConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["value"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  const value = record.value;
  if (!isFiniteNumber(value) || value < config.min || value > config.max) {
    errors.push("value must be between min and max");
  } else if (
    config.step !== undefined &&
    !isAlignedToStep(value, config.min, config.step)
  ) {
    errors.push("value must align with step");
  }
  return errors;
}

function validateRankingResponse(
  config: RankingConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["orderedItemIds"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  const orderedItemIds = record.orderedItemIds;
  const validIds = new Set(config.items.map((item) => item.id));
  if (!isStringArray(orderedItemIds)) {
    errors.push("orderedItemIds must be an array of strings");
  } else if (orderedItemIds.length !== config.items.length) {
    errors.push("orderedItemIds must include every item exactly once");
  } else if (new Set(orderedItemIds).size !== orderedItemIds.length) {
    errors.push("orderedItemIds must not contain duplicates");
  } else if (orderedItemIds.some((id) => !validIds.has(id))) {
    errors.push("orderedItemIds contains an unknown item id");
  }
  return errors;
}

function validateGuessTheNumberResponse(
  config: GuessTheNumberConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["guess"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  const guess = record.guess;
  if (!isFiniteNumber(guess) || guess < config.min || guess > config.max) {
    errors.push("guess must be between min and max");
  }
  return errors;
}

function validateTwoByTwoResponse(
  config: TwoByTwoConfig,
  response: unknown
): string[] {
  const errors = requireObjectWithKeys(response, ["x", "y"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = response as Record<string, unknown>;
  if (
    !isFiniteNumber(record.x) ||
    record.x < config.xMin ||
    record.x > config.xMax
  ) {
    errors.push("x must be between xMin and xMax");
  }
  if (
    !isFiniteNumber(record.y) ||
    record.y < config.yMin ||
    record.y > config.yMax
  ) {
    errors.push("y must be between yMin and yMax");
  }
  return errors;
}
