import { describe, it, expect } from "vitest";
import { normalizeLocale } from "../src/localizations/locale";

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
