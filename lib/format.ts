// Shared German-locale number formatters (dot as thousands separator,
// comma as decimal separator).
const de = new Intl.NumberFormat("de-DE");
const de1 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Formats a number with default (integer-style) German formatting.
export const nf = (n: number) => de.format(n);
// Formats a number with exactly one decimal place, German formatting.
export const nf1 = (n: number) => de1.format(n);
