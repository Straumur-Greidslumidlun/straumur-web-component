import { Language } from "./translations";

/** The locale vocabulary of the public API: short codes only. */
export type PublicLocale = "is" | "en";

/**
 * Normalizes a public locale to the internal BCP-47 Language.
 *
 * Tolerates the legacy full tags ("en-US"/"is-IS") at runtime — 1.x accepted them in
 * setLanguage/updateConfig and IIFE consumers get no compile-time checking — while the
 * public types narrow to short codes. Anything unrecognized falls back to Icelandic,
 * matching the constructor's historical default.
 */
export function normalizeLocale(locale: PublicLocale | Language | undefined): Language {
  switch (locale) {
    case "en":
    case "en-US":
      return "en-US";
    default:
      return "is-IS";
  }
}
