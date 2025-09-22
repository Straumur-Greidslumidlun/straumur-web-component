import { Language, TranslationKey, translations } from "./translations";

export class I18nService {
  constructor(
    private language: Language,
    private customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>
  ) {}

  t(key: TranslationKey): string {
    const localizedString = this.customLocalizations?.[this.language]?.[key];
    return localizedString || translations[this.language][key] || key;
  }

  setLanguage(language: Language): void {
    this.language = language;
  }

  updateCustomLocalizations(
    customLocalizations: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>
  ): void {
    this.customLocalizations = customLocalizations;
  }
}
