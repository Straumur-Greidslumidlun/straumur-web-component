import { Language } from "./translations";
import type { CustomLocalizations, Localizations } from "../models/models";

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

const LOCALIZATION_LANGUAGES: Record<string, Language> = {
  is: "is-IS",
  "is-IS": "is-IS",
  en: "en-US",
  "en-US": "en-US",
};

/**
 * Re-keys public `localizations` (short codes, or legacy full tags) by the internal Language tag,
 * merging "en" and "en-US" entries when both are given. Unknown language keys are dropped with a
 * warning — unlike normalizeLocale, they must not fall back to Icelandic and overwrite its copy.
 */
export function normalizeLocalizations(localizations: Localizations | undefined): CustomLocalizations | undefined {
  if (!localizations) {
    return undefined;
  }

  const normalized: CustomLocalizations = {};
  for (const [key, overrides] of Object.entries(localizations)) {
    const language = LOCALIZATION_LANGUAGES[key];
    if (!language) {
      console.warn(`[StraumurCheckout] localizations: unsupported language "${key}" ignored (use "is" or "en").`);
      continue;
    }
    if (overrides) {
      normalized[language] = { ...normalized[language], ...overrides };
    }
  }
  return normalized;
}
