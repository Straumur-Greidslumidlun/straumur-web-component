import { useEffect } from "preact/hooks";
import { StraumurCheckoutConfiguration } from "../../models/models";

/**
 * Re-initializes an Adyen element when the checkout configuration changes.
 *
 * Adyen elements cannot change locale through `.update()` (Adyen issue #2407), so an
 * already-initialized component must be torn down and rebuilt. The configuration object's
 * identity is the trigger: `updateConfig`/`setLanguage` create a fresh object per change,
 * while re-renders reuse the same one.
 *
 * @param configuration the internal checkout configuration (identity-stable per config change)
 * @param isReady whether the Adyen element is currently initialized and safe to rebuild
 * @param reinitialize tears down (if needed) and rebuilds the Adyen element
 */
export function useAdyenLocaleReinit(
  configuration: StraumurCheckoutConfiguration,
  isReady: () => boolean,
  reinitialize: () => void
): void {
  useEffect(() => {
    if (isReady()) {
      reinitialize();
    }
    // Deliberately keyed on configuration identity only: isReady/reinitialize are
    // fresh closures every render and must not re-trigger the rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration]);
}
