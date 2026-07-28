import { h } from "preact";

// Placeholder mark until the official Kortalán brand asset is supplied. Uses currentColor so it
// follows the widget theme; swap for the real logo when available.
const KortalanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="26" fill="none" viewBox="0 0 40 26">
    <rect x="0.5" y="0.5" width="39" height="25" rx="6" fill="none" stroke="currentColor" opacity="0.35" />
    <path fill="currentColor" d="M11 7h2.2v5.1L18 7h2.7l-4.7 5.1L21 19h-2.8l-3.7-5.2-1.3 1.4V19H11V7Z" />
    <path fill="currentColor" d="M23 7h2.2v10h4.6v2H23V7Z" />
  </svg>
);

export default KortalanIcon;
