import { h } from "preact";
import LoaderIcon from "../../assets/icons/loader";

/**
 * Spinner with an accessible name: a polite status region whose only text is the visually-hidden
 * label (the SVG itself is decorative). Takes the label as a string because the imperative
 * LoaderScreen renders outside the I18nProvider.
 */
export function LoadingIndicator({ label }: { label: string }): h.JSX.Element {
  return (
    <span className="straumur__loading-indicator" role="status">
      <span className="straumur__loading-indicator__icon" aria-hidden="true">
        <LoaderIcon />
      </span>
      <span className="straumur__visually-hidden">{label}</span>
    </span>
  );
}
