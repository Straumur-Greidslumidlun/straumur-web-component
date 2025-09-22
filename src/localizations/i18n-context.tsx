import { h } from "preact";
import { createContext, ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { Language } from "./translations";
import { I18nService } from "./i18n-service";

type I18nContextType = {
  i18n: I18nService;
  changeLanguage: (language: Language) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({
  children,
  i18nService,
  onLanguageChange,
}: {
  children: ComponentChildren;
  i18nService: I18nService; // Use existing instance from StraumurCheckout
  onLanguageChange?: (language: Language) => void;
}): h.JSX.Element => {
  const changeLanguage = (newLanguage: Language) => {
    i18nService.setLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  return <I18nContext.Provider value={{ i18n: i18nService, changeLanguage }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
