import { ApplePayButtonTheme, GooglePayButtonTheme, ResolvedTheme } from "../models/models";

// Adyen's own button-color unions, mirrored here so this util doesn't import the Adyen SDK just for
// two string-literal types (keeps it trivially unit-testable).
type GooglePayButtonColor = "default" | "black" | "white";
type ApplePayButtonColor = "black" | "white" | "white-outline";

/**
 * Google Pay button color derived from the resolved widget theme, overridable via
 * `googlePayButtonTheme`. Default: light widget → white button, dark widget → black button.
 */
export function resolveGooglePayButtonColor(
  theme: ResolvedTheme,
  override?: GooglePayButtonTheme
): GooglePayButtonColor {
  const choice = override ?? (theme === "dark" ? "dark" : "white");

  return choice === "dark" ? "black" : "white";
}

/**
 * Apple Pay button style derived from the resolved widget theme, overridable via
 * `applePayButtonTheme`. Default: light widget → "white-outline" (a plain white button would vanish
 * against the widget's white surface), dark widget → black button.
 */
export function resolveApplePayButtonColor(theme: ResolvedTheme, override?: ApplePayButtonTheme): ApplePayButtonColor {
  const choice = override ?? (theme === "dark" ? "dark" : "light");

  return choice === "dark" ? "black" : "white-outline";
}
