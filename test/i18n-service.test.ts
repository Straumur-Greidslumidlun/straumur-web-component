import { describe, it, expect } from "vitest";
import { I18nService } from "../src/localizations/i18n-service";
import { translations } from "../src/localizations/translations";

describe("I18nService.t", () => {
  it("returns the built-in translation for the active language", () => {
    const i18n = new I18nService("en-US");
    expect(i18n.t("cards.title")).toBe(translations["en-US"]["cards.title"]);
  });

  it("returns the Icelandic translation when the language is is-IS", () => {
    const i18n = new I18nService("is-IS");
    expect(i18n.t("cards.title")).toBe(translations["is-IS"]["cards.title"]);
  });

  it("prefers a merchant custom localization over the built-in string", () => {
    const i18n = new I18nService("en-US", {
      "en-US": { "cards.title": "Pay with your card" },
    });
    expect(i18n.t("cards.title")).toBe("Pay with your card");
  });

  it("falls back to the built-in string when the custom localization lacks the key", () => {
    const i18n = new I18nService("en-US", {
      "en-US": { "cards.cardNumber": "Custom number" },
    });
    expect(i18n.t("cards.title")).toBe(translations["en-US"]["cards.title"]);
  });

  it("falls back to the raw key when neither custom nor built-in has it", () => {
    const i18n = new I18nService("en-US");
    // Casting because the whole point is an unknown key at runtime.
    expect(i18n.t("does.not.exist" as never)).toBe("does.not.exist");
  });

  it("uses the new language after setLanguage", () => {
    const i18n = new I18nService("en-US");
    i18n.setLanguage("is-IS");
    expect(i18n.t("cards.title")).toBe(translations["is-IS"]["cards.title"]);
  });

  it("applies custom localizations added via updateCustomLocalizations", () => {
    const i18n = new I18nService("en-US");
    i18n.updateCustomLocalizations({ "en-US": { "cards.title": "Updated" } });
    expect(i18n.t("cards.title")).toBe("Updated");
  });
});
