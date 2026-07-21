import {
  type SlideConfigByType,
  type MultipleChoiceConfig,
  type WordCloudConfig,
  type ScalesConfig,
  type RankingConfig,
  type GuessTheNumberConfig,
  type TwoByTwoConfig
} from "./configs";
import { SlideType } from "./types";
import {
  isFiniteNumber,
  isIntegerInRange,
  isNonEmptyString,
  isPositiveFiniteNumber,
  requireObjectWithKeys,
  validateChoiceOptions
} from "./validation-utils";

export function isValidSlideConfig<T extends SlideType>(
  type: T,
  config: unknown
): config is SlideConfigByType[T] {
  return getSlideConfigValidationErrors(type, config).length === 0;
}

export function getSlideConfigValidationErrors(
  type: SlideType,
  config: unknown
): string[] {
  switch (type) {
    case SlideType.MultipleChoice:
      return validateMultipleChoiceConfig(config);
    case SlideType.WordCloud:
      return validateWordCloudConfig(config);
    case SlideType.OpenEnded:
      return validateTextLimitConfig(config, "maxLength", 1, 1000);
    case SlideType.Scales:
      return validateScalesConfig(config);
    case SlideType.Ranking:
      return validateRankingConfig(config);
    case SlideType.GuessTheNumber:
      return validateGuessTheNumberConfig(config);
    case SlideType.TwoByTwo:
      return validateTwoByTwoConfig(config);
  }
}

function validateMultipleChoiceConfig(
  config: unknown
): string[] {
  const errors = requireObjectWithKeys(config, ["options", "allowMultiple"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof MultipleChoiceConfig, unknown>;
  if (typeof record.allowMultiple !== "boolean") {
    errors.push("allowMultiple must be a boolean");
  }
  errors.push(...validateChoiceOptions(record.options, "options", 3, 7));
  return errors;
}

function validateWordCloudConfig(config: unknown): string[] {
  const errors = requireObjectWithKeys(config, [
    "inputCount",
    "maxWordLength"
  ]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof WordCloudConfig, unknown>;
  if (!isIntegerInRange(record.inputCount, 1, 3)) {
    errors.push("inputCount must be an integer between 1 and 3");
  }
  if (!isIntegerInRange(record.maxWordLength, 1, 40)) {
    errors.push("maxWordLength must be an integer between 1 and 40");
  }
  return errors;
}

function validateTextLimitConfig(
  config: unknown,
  field: string,
  min: number,
  max: number
): string[] {
  const errors = requireObjectWithKeys(config, [field]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<string, unknown>;
  if (!isIntegerInRange(record[field], min, max)) {
    errors.push(`${field} must be an integer between ${min} and ${max}`);
  }
  return errors;
}

function validateScalesConfig(config: unknown): string[] {
  const errors = requireObjectWithKeys(
    config,
    ["min", "max", "minLabel", "maxLabel"],
    ["step"]
  );
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof ScalesConfig, unknown>;
  if (!isFiniteNumber(record.min) || !isFiniteNumber(record.max)) {
    errors.push("min and max must be finite numbers");
  } else if (record.min >= record.max) {
    errors.push("min must be lower than max");
  }
  if (!isNonEmptyString(record.minLabel, 80)) {
    errors.push("minLabel must be a non-empty string up to 80 characters");
  }
  if (!isNonEmptyString(record.maxLabel, 80)) {
    errors.push("maxLabel must be a non-empty string up to 80 characters");
  }
  if (record.step !== undefined && !isPositiveFiniteNumber(record.step)) {
    errors.push("step must be a positive finite number");
  }
  return errors;
}

function validateRankingConfig(config: unknown): string[] {
  const errors = requireObjectWithKeys(config, ["items"]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof RankingConfig, unknown>;
  errors.push(...validateChoiceOptions(record.items, "items", 3, 6));
  return errors;
}

function validateGuessTheNumberConfig(config: unknown): string[] {
  const errors = requireObjectWithKeys(config, ["min", "max"], [
    "correctValue"
  ]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof GuessTheNumberConfig, unknown>;
  if (!isFiniteNumber(record.min) || !isFiniteNumber(record.max)) {
    errors.push("min and max must be finite numbers");
  } else if (record.min >= record.max) {
    errors.push("min must be lower than max");
  }
  if (
    record.correctValue !== undefined &&
    (!isFiniteNumber(record.correctValue) ||
      record.correctValue < Number(record.min) ||
      record.correctValue > Number(record.max))
  ) {
    errors.push("correctValue must be between min and max");
  }
  return errors;
}

function validateTwoByTwoConfig(config: unknown): string[] {
  const errors = requireObjectWithKeys(config, [
    "xMin",
    "xMax",
    "yMin",
    "yMax",
    "xMinLabel",
    "xMaxLabel",
    "yMinLabel",
    "yMaxLabel"
  ]);
  if (errors.length > 0) {
    return errors;
  }

  const record = config as Record<keyof TwoByTwoConfig, unknown>;
  if (!isFiniteNumber(record.xMin) || !isFiniteNumber(record.xMax)) {
    errors.push("xMin and xMax must be finite numbers");
  } else if (record.xMin >= record.xMax) {
    errors.push("xMin must be lower than xMax");
  }
  if (!isFiniteNumber(record.yMin) || !isFiniteNumber(record.yMax)) {
    errors.push("yMin and yMax must be finite numbers");
  } else if (record.yMin >= record.yMax) {
    errors.push("yMin must be lower than yMax");
  }

  for (const field of [
    "xMinLabel",
    "xMaxLabel",
    "yMinLabel",
    "yMaxLabel"
  ] as const) {
    if (!isNonEmptyString(record[field], 80)) {
      errors.push(`${field} must be a non-empty string up to 80 characters`);
    }
  }
  return errors;
}
