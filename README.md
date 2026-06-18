# straumur-web-component

Straumur eComponents — embeddable checkout components for merchants.

## Installation

### npm

```bash
npm install straumur-web-component
```

```ts
import { StraumurCheckout } from "straumur-web-component";
```

### CDN

The library is published to a CDN on every GitHub Release. Each release is
available under an immutable, version-pinned URL (recommended for production)
and a mutable `latest/` URL.

**IIFE bundle** — exposes the global `StraumurWeb`:

```html
<script
  src="https://<your-cdn-domain>/libs/straumur-web-component/<version>/index.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
<script>
  // window.StraumurWeb.StraumurCheckout
</script>
```

**ESM module:**

```html
<script type="module">
  import { StraumurCheckout } from "https://<your-cdn-domain>/libs/straumur-web-component/<version>/index.mjs";
</script>
```

The exact versioned URL and the matching [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
(`integrity`) hash for each release are printed in that release's GitHub Actions
run summary (the "Publish Package to CDN" workflow). Always pin to a specific
version with its SRI hash in production; the `latest/` path is convenient for
testing but is not integrity-pinned.

## Publishing

- **npm** — `.github/workflows/publish-to-npmjs.yml` publishes to npmjs on release.
- **CDN** — `.github/workflows/publish-to-cdn.yml` builds and uploads to AWS S3
  (fronted by CloudFront) on release. See the comments at the top of that file
  for the required GitHub secrets and variables.
