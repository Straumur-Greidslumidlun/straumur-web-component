import { useEffect, useRef } from "preact/hooks";
import { ResolvedTheme, StraumurCheckoutConfiguration } from "../../models/models";

type BuiltWith = { configuration: StraumurCheckoutConfiguration; resolvedTheme: ResolvedTheme };

export interface AdyenReinitOptions {
  configuration: StraumurCheckoutConfiguration;
  /** The field/button colors are baked into the Adyen element at init, so a live theme flip rebuilds too. */
  resolvedTheme: ResolvedTheme;
  /** The Adyen element is initialized (mounted) and safe to tear down. */
  ready: boolean;
  /**
   * A payment is in flight or a 3DS challenge is showing. Rebuilding then would destroy the challenge
   * or leave Adyen resolving on a dead element, so the rebuild is deferred until this clears.
   */
  busy: boolean;
  /** Tears down the current Adyen element and builds a new one (calling markBuilt again). */
  reinitialize: () => void;
}

/**
 * Re-initializes an Adyen element when the checkout configuration (or resolved theme) it was built
 * with changes.
 *
 * Adyen elements cannot change locale through `.update()` (Adyen issue #2407), so an initialized
 * component must be torn down and rebuilt. The configuration object's identity is the trigger:
 * `updateConfig`/`setLanguage` create a fresh object per change, while re-renders reuse the same one.
 *
 * The component calls the returned `markBuilt()` at the start of every init, recording exactly what
 * that element was built with. A rebuild then happens only when the element is ready, not busy, and
 * built from something older — so a change that arrives mid-init or mid-payment is applied once
 * afterwards, and a lazy first init with an already-current config never triggers a second one.
 */
export function useAdyenLocaleReinit({ configuration, resolvedTheme, ready, busy, reinitialize }: AdyenReinitOptions): {
  markBuilt: () => void;
} {
  const builtWithRef = useRef<BuiltWith | null>(null);

  useEffect(() => {
    const built = builtWithRef.current;
    if (!ready || busy || !built) {
      return;
    }
    if (built.configuration === configuration && built.resolvedTheme === resolvedTheme) {
      return;
    }
    reinitialize();
    // reinitialize is a fresh closure every render and must not itself re-trigger the rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration, resolvedTheme, ready, busy]);

  return {
    markBuilt: () => {
      builtWithRef.current = { configuration, resolvedTheme };
    },
  };
}
