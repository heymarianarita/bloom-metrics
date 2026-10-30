/** Axis ticks that stay short: 1200 → "1.2K", 250788 → "251K". */
export const compactNumber = (value: number) =>
  Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
