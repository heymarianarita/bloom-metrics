import * as React from "react";

/** Bloom monochrome icons used by the Table sort control (@vinted/monochrome-icons, 16px). */
const icon = (d: string) => (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" viewBox="0 0 16 16" width={16} height={16} aria-hidden="true" {...props}>
    <path fill="currentColor" d={d} />
  </svg>
);

export const ArrowsDownTop16 = icon(
  "M4 5.75a.75.75 0 0 1 .75.75v6.899l1.77-1.475a.75.75 0 0 1 .96 1.152l-3 2.5a.75.75 0 0 1-.96 0l-3-2.5a.75.75 0 0 1 .96-1.152l1.77 1.475V6.5A.75.75 0 0 1 4 5.75M10.63.348a.75.75 0 0 1 .85.076l3 2.5a.75.75 0 0 1-.96 1.152l-1.77-1.474V9.5a.75.75 0 0 1-1.5 0V2.602L8.48 4.076a.75.75 0 0 1-.96-1.152l3-2.5z",
);

export const ArrowTop16 = icon(
  "M7.949 15a.777.777 0 0 0 .783-.77V3.491l4.958 4.51a.79.79 0 0 0 1.107-.048.76.76 0 0 0-.042-1.074l-6.038-5.6a1.057 1.057 0 0 0-1.433 0l-6.04 5.602a.755.755 0 0 0-.042 1.07.785.785 0 0 0 1.107.042l4.856-4.502V14.23c0 .426.35.771.784.771Z",
);

export const ArrowDown16 = icon(
  "M7.949 1c.432 0 .783.345.783.77v10.738l4.958-4.51a.79.79 0 0 1 1.107.048.76.76 0 0 1-.042 1.074l-6.038 5.6a1.057 1.057 0 0 1-1.433 0l-6.04-5.602a.755.755 0 0 1-.042-1.07.785.785 0 0 1 1.107-.042l4.856 4.502V1.77c0-.426.35-.771.784-.771Z",
);
