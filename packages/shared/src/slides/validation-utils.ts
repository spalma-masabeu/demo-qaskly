export function validateChoiceOptions(
  value: unknown,
  field: string,
  min: number,
  max: number
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) {
    return [`${field} must be an array`];
  }
  if (value.length < min || value.length > max) {
    errors.push(`${field} must include between ${min} and ${max} items`);
  }

  const ids = new Set<string>();
  for (const item of value) {
    const itemErrors = requireObjectWithKeys(item, ["id", "label"]);
    if (itemErrors.length > 0) {
      errors.push(`${field} items must contain only id and label`);
      continue;
    }
    if (!isNonEmptyString(item.id, 64)) {
      errors.push(`${field} item id must be a non-empty string`);
    } else {
      ids.add(item.id);
    }
    if (!isNonEmptyString(item.label, 120)) {
      errors.push(`${field} item label must be a non-empty string`);
    }
  }

  if (ids.size !== value.length) {
    errors.push(`${field} item ids must be unique`);
  }
  return errors;
}

export function requireObjectWithKeys(
  value: unknown,
  requiredKeys: string[],
  optionalKeys: string[] = []
): string[] {
  if (!isPlainObject(value)) {
    return ["value must be an object"];
  }

  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const errors: string[] = [];
  for (const key of requiredKeys) {
    if (!(key in value)) {
      errors.push(`${key} is required`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${key} is not allowed`);
    }
  }
  return errors;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isNonEmptyString(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function isIntegerInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function isAlignedToStep(
  value: number,
  min: number,
  step: number
): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < Number.EPSILON * 100;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
