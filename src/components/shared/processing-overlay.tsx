import { h } from "preact";
import "./processing-overlay.css";
import LoaderIcon from "../../assets/icons/loader";
import { useI18n } from "../../localizations/i18n-context";

/**
 * Covers a payment method's Adyen mount node while the shopper waits on us (see the context's
 * paymentProcessing). Rendered as a SIBLING of the mount node, never inside it: Adyen swaps the card
 * fields for the 3DS component by rendering into that node, which would wipe any children we own.
 */
export function ProcessingOverlay({
  visible,
  compact = false,
}: {
  visible: boolean;
  /** Spinner only (label visually hidden) — for the 48px wallet tile. */
  compact?: boolean;
}): h.JSX.Element | null {
  const { i18n } = useI18n();

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`straumur__processing-overlay${compact ? " straumur__processing-overlay--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="straumur__processing-overlay__icon" aria-hidden="true">
        <LoaderIcon />
      </span>
      <span className="straumur__processing-overlay__label">{i18n.t("payment.processing")}</span>
    </div>
  );
}
