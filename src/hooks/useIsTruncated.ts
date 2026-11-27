import * as React from "react";

/** True while the element's text is cut off by `truncate` (wider than its box). */
export const useIsTruncated = <T extends HTMLElement>(text: string) => {
  const ref = React.useRef<T>(null);
  const [truncated, setTruncated] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTruncated(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return [ref, truncated] as const;
};
