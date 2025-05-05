import { h } from "preact";

const FailureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <circle
      cx="60"
      cy="60"
      r="50"
      fill="none"
      stroke="#d03e00"
      stroke-width="5"
      stroke-dasharray="314"
      stroke-dashoffset="314"
    >
      <animate attributeName="stroke-dashoffset" from="314" to="0" dur="1s" fill="freeze" />
    </circle>

    <g transform="translate(60,60)">
      <g id="crossGroup">
        <line
          x1="-20"
          y1="-20"
          x2="20"
          y2="20"
          stroke="#d03e00"
          stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="57"
          stroke-dashoffset="57"
        >
          <animate attributeName="stroke-dashoffset" from="57" to="0" dur="0.3s" begin="1s" fill="freeze" />
        </line>

        <line
          x1="20"
          y1="-20"
          x2="-20"
          y2="20"
          stroke="#d03e00"
          stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="57"
          stroke-dashoffset="57"
        >
          <animate attributeName="stroke-dashoffset" from="57" to="0" dur="0.3s" begin="1.3s" fill="freeze" />
        </line>
      </g>
    </g>
  </svg>
);

export default FailureIcon;
