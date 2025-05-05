import { Language, TranslationKey, translations } from "./translations";

export default function i18n(language: Language, key: TranslationKey) {
  return translations[language][key] || key;
}
