import { Language, TranslationKey, translations } from "./translations";

export default function i18n(
  language: Language,
  key: TranslationKey,
  customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>
): string {
  const localizedString = customLocalizations?.[language]?.[key];
  return localizedString || translations[language][key] || key;
}
