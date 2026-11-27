import * as React from "react";

/** True inside a DesignStatGroup: stat cards drop their own border and become sections. */
export const StatGroupContext = React.createContext(false);
/** True for the group's featured card: it shows its number larger. */
export const StatFeaturedContext = React.createContext(false);
