import { describe, it, expect, vi } from "vitest";
import { normalizeLocale, normalizeLocalizations } from "../src/localizations/locale";

describe("normalizeLocale", () => {
  it("maps the public short codes to internal languages", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("is")).toBe("is-IS");
  });

  it("tolerates the legacy full tags", () => {
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("is-IS")).toBe("is-IS");
  });

  it("falls back to Icelandic for undefined or unknown values", () => {
    expect(normalizeLocale(undefined)).toBe("is-IS");
    expect(normalizeLocale("fr" as never)).toBe("is-IS");
  });
});

describe("normalizeLocalizations", () => {
  it("re-keys short codes and legacy full tags to the internal language, merging both forms", () => {
    expect(
      normalizeLocalizations({
        en: { "cards.title": "Pay by card" },
        "en-US": { "error.unknownError": "Oops" },
        is: { "cards.title": "Kort" },
      })
    ).toEqual({
      "en-US": { "cards.title": "Pay by card", "error.unknownError": "Oops" },
      "is-IS": { "cards.title": "Kort" },
    });
  });

  it("drops unknown languages instead of letting them overwrite Icelandic", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(normalizeLocalizations({ de: { "cards.title": "Karte" } } as any)).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("passes undefined through", () => {
    expect(normalizeLocalizations(undefined)).toBeUndefined();
  });
});
