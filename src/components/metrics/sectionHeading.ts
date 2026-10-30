import * as React from "react";

/** A view section's own title, which replaces the chart's default heading inside it. */
const SectionHeadingContext = React.createContext<string | undefined>(undefined);

export const SectionHeadingProvider = SectionHeadingContext.Provider;

/** The heading to show: the section's title when one is set, otherwise the chart's own. */
export const useSectionHeading = (fallback: string) => React.useContext(SectionHeadingContext) || fallback;
