import { describe, it, expect, vi, afterEach } from "vitest";

describe("registerWidgetFonts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("registers the three used weights once, under the widget-specific family", async () => {
    const added: Array<{ family: string; source: string; descriptors: FontFaceDescriptors }> = [];
    class FakeFontFace {
      constructor(
        public family: string,
        public source: string,
        public descriptors: FontFaceDescriptors
      ) {}
      load = vi.fn(() => Promise.resolve(this));
    }
    vi.stubGlobal("FontFace", FakeFontFace);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { add: (face: FakeFontFace) => added.push(face) },
    });
    const { registerWidgetFonts, WIDGET_FONT_FAMILY } = await import("../src/styles/fonts");

    registerWidgetFonts();
    registerWidgetFonts();

    expect(added.map((face) => face.descriptors.weight)).toEqual(["400", "500", "700"]);
    expect(added.every((face) => face.family === WIDGET_FONT_FAMILY)).toBe(true);
    expect(added.every((face) => face.source.includes('format("woff2")'))).toBe(true);
  });

  it("is a no-op where the FontFace API is missing (jsdom, old browsers, SSR)", async () => {
    vi.stubGlobal("FontFace", undefined);
    const { registerWidgetFonts } = await import("../src/styles/fonts");

    expect(() => registerWidgetFonts()).not.toThrow();
  });
});
