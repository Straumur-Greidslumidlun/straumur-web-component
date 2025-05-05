import { h } from "preact";

const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <circle
      cx="60"
      cy="60"
      r="50"
      fill="none"
      stroke="#5b8206"
      stroke-width="5"
      stroke-dasharray="314"
      stroke-dashoffset="314"
    >
      <animate attributeName="stroke-dashoffset" from="314" to="0" dur="1s" fill="freeze" />
    </circle>

    <g transform="translate(60,60)">
      <path
        d="M-25 5 L-5 25 L25 -15"
        fill="none"
        stroke="#5b8206"
        stroke-width="6"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="100"
        stroke-dashoffset="100"
      >
        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.5s" begin="1s" fill="freeze" />
        <animateTransform
          attributeName="transform"
          type="scale"
          from="1 1"
          to="1.2 1.2"
          begin="1.5s"
          dur="0.2s"
          fill="freeze"
          additive="sum"
        />
        <animateTransform
          attributeName="transform"
          type="scale"
          from="1.2 1.2"
          to="1 1"
          begin="1.7s"
          dur="0.2s"
          fill="freeze"
          additive="sum"
        />
      </path>
    </g>
  </svg>
);

export default SuccessIcon;
