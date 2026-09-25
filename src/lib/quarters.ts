/** Quarter helpers — quarters are stored as "YYYY-Qn" strings everywhere. */

export const quarterOf = (date: Date) =>
  `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;

export const currentQuarter = () => quarterOf(new Date());

export const parseQuarter = (quarter: string) => {
  const [year, q] = quarter.split("-Q");
  return { year: Number(year), quarter: Number(q) };
};

export const shiftQuarter = (quarter: string, delta: number) => {
  const { year, quarter: q } = parseQuarter(quarter);
  const index = year * 4 + (q - 1) + delta;
  return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
};

export const previousQuarter = (quarter: string) => shiftQuarter(quarter, -1);

/** Most recent `count` quarters, newest first. */
export const recentQuarters = (count = 8, from = currentQuarter()) =>
  Array.from({ length: count }, (_, i) => shiftQuarter(from, -i));

export const sortQuarters = (quarters: string[]) =>
  [...quarters].sort((a, b) => {
    const pa = parseQuarter(a);
    const pb = parseQuarter(b);
    return pa.year - pb.year || pa.quarter - pb.quarter;
  });
