/** US dollars from a token price. Tiny amounts keep four decimal places; the rest keep two. */
export const formatUsd = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : 2;
  const [whole, frac] = abs.toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}$${grouped}.${frac}`;
};
