import regular from "../assets/fonts/akzidenz-grotesk-pro-regular.woff2";
import medium from "../assets/fonts/akzidenz-grotesk-pro-medium.woff2";
import bold from "../assets/fonts/akzidenz-grotesk-pro-bold.woff2";

/**
 * The widget's typeface. Registered through the FontFace API rather than CSS @font-face because tsup's
 * injectStyle passes CSS through without resolving url(): the woff2 files are imported here instead,
 * where the ".woff2": "dataurl" loader inlines them, so the CDN <script> stays one self-contained file.
 *
 * Only the weights the CSS uses (400, 500, 700); the light/italic files in assets/fonts are unused. The
 * family name is widget-specific so it can't collide with a host page's own Akzidenz-Grotesk.
 */
export const WIDGET_FONT_FAMILY = "StraumurAkzidenzGroteskPro";

const FACES: ReadonlyArray<{ source: string; weight: string }> = [
  { source: regular, weight: "400" },
  { source: medium, weight: "500" },
  { source: bold, weight: "700" },
];

let registered = false;

/** Idempotent; a no-op outside a browser (SSR) or where the FontFace API is missing. */
export function registerWidgetFonts(): void {
  if (registered || typeof document === "undefined" || !document.fonts || typeof FontFace === "undefined") {
    return;
  }
  registered = true;

  for (const { source, weight } of FACES) {
    const face = new FontFace(WIDGET_FONT_FAMILY, `url(${source}) format("woff2")`, {
      weight,
      style: "normal",
      display: "swap",
    });
    document.fonts.add(face);
    // Fonts are cosmetic: a failed decode falls back to sans-serif and must never surface as an error.
    face.load().catch(() => {});
  }
}
