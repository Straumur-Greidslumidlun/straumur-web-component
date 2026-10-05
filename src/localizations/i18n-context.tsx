import { h } from "preact";
import { createContext, ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { I18nService } from "./i18n-service";

type I18nContextType = {
  i18n: I18nService;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Language changes go through StraumurCheckout.setLanguage/updateConfig, which build a new configuration
// object (the Adyen re-init trigger) — there is deliberately no in-tree way to switch language.
export const I18nProvider = ({
  children,
  i18nService,
}: {
  children: ComponentChildren;
  i18nService: I18nService; // Use existing instance from StraumurCheckout
}): h.JSX.Element => {
  return <I18nContext.Provider value={{ i18n: i18nService }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
