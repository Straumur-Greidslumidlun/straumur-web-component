import { RefObject } from "preact";
import { useEffect, useState } from "preact/hooks";

/**
 * Live inline width of the widget (the closest .straumur__root-component), for the rare layout choice
 * CSS container queries can't express — e.g. how many brand icons fit before a "+N" counter. Never the
 * viewport: the widget's width is set by its host container, unrelated to the window.
 *
 * Returns null until measured, or where ResizeObserver is unavailable (jsdom, very old browsers);
 * callers should then fall back to their roomy default.
 */
export function useWidgetWidth(anchorRef: RefObject<Element>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const root = anchorRef.current?.closest(".straumur__root-component");
    if (!root || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [anchorRef]);

  return width;
}
