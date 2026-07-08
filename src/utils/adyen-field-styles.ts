import { ResolvedTheme } from "../models/models";

/**
 * Color values for the Adyen secured-field iframes (card number / expiry / CVC).
 *
 * Those fields render inside cross-origin iframes our CSS cannot reach, so their text,
 * placeholder, and error colors must be passed to Adyen as literal values — they cannot use
 * the CSS custom properties in styles/main.css. Keep these in sync with the palette tokens
 * there (the light values mirror --straumur__color-text / -secondary / -red-beta, the dark
 * values mirror their [data-theme="dark"] overrides).
 *
 * Structurally compatible with Adyen's StylesObject (which the SDK does not export).
 */
export function getAdyenFieldStyles(theme: ResolvedTheme) {
  if (theme === "dark") {
    return {
      base: { color: "#e8edf2" },
      placeholder: { color: "#9aa7b5" },
      error: { color: "#e08a8a" },
    };
  }

  return {
    base: { color: "#00112c" },
    placeholder: { color: "#72889d" },
    error: { color: "#d96666" },
  };
}
