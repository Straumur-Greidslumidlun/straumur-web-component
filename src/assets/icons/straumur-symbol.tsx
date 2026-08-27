import { h } from "preact";

// The Straumur symbol (three dots on a bar) shown on the Kortalán express button. Paths are verbatim
// from the Figma export of Frame 6550 (node 2253:2715); they are authored in that frame's 576x76
// coordinate space, so the group is translated into a 32x8 viewBox rather than having the numbers
// rewritten. Fill is currentColor so the button controls the color in one place.
const StraumurSymbol = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="8" viewBox="0 0 32 8" fill="none" aria-hidden="true">
    <g transform="translate(-219.312 -34)">
      <path
        d="M247.306 42C249.518 42 251.312 40.2091 251.312 38C251.312 35.7909 249.518 34 247.306 34C245.094 34 243.301 35.7909 243.301 38C243.301 40.2091 245.094 42 247.306 42Z"
        fill="currentColor"
      />
      <path
        d="M235.288 42C237.501 42 239.294 40.2091 239.294 38C239.294 35.7909 237.501 34 235.288 34C233.076 34 231.283 35.7909 231.283 38C231.283 40.2091 233.076 42 235.288 42Z"
        fill="currentColor"
      />
      <path
        d="M223.317 42C225.529 42 227.322 40.2091 227.322 38C227.322 35.7909 225.529 34 223.317 34C221.105 34 219.312 35.7909 219.312 38C219.312 40.2091 221.105 42 223.317 42Z"
        fill="currentColor"
      />
      <path d="M247.241 37.0796H222.193V38.8505H247.241V37.0796Z" fill="currentColor" />
    </g>
  </svg>
);

export default StraumurSymbol;
