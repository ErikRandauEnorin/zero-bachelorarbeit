export function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export function wattsToKilowatts(
  value: unknown,
): number | undefined {
  const number = finiteNumber(value);

  if (number === undefined) {
    return undefined;
  }

  return number / 1000;
}

export function validPercentage(
  value: unknown,
): number | undefined {
  const number = finiteNumber(value);

  if (
    number === undefined ||
    number < 0 ||
    number > 100
  ) {
    return undefined;
  }

  return number;
}

export function resolveObservedAt(
  providerTimestamp: unknown,
  fallback: Date,
): Date {
  if (typeof providerTimestamp !== "string") {
    return fallback;
  }

  const parsed = new Date(providerTimestamp);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
}