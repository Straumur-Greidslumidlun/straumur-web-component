import { useEffect } from "preact/hooks";
import { RefObject } from "preact";

/**
 * Moves keyboard focus into `ref` when `active` transitions from false to true.
 *
 * Used when a 3-D Secure challenge takes over the widget: the content the shopper was
 * interacting with is replaced, so focus must follow into the challenge or a keyboard /
 * screen-reader user is stranded on a now-hidden control. The target needs `tabIndex={-1}`
 * to be programmatically focusable.
 *
 * The dependency array does the gating: the effect only runs when `active` changes, so a
 * re-render while it stays active will not steal focus back.
 */
export function useFocusOnActivate(ref: RefObject<HTMLElement>, active: boolean): void {
  useEffect(() => {
    if (active) {
      ref.current?.focus();
    }
  }, [active, ref]);
}
