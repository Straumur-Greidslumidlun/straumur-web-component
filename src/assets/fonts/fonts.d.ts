// tsup's ".woff2": "dataurl" loader turns a font import into its data: URL string.
declare module "*.woff2" {
  const dataUrl: string;
  export default dataUrl;
}
