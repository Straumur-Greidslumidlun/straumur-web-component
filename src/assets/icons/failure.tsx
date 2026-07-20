import { h } from "preact";
import "./result-icons.css";

const FailureIcon = () => (
  <svg
    className="straumur__result-icon straumur__result-icon--failure"
    xmlns="http://www.w3.org/2000/svg"
    width="120"
    height="120"
    viewBox="0 0 120 120"
    role="img"
  >
    <circle className="straumur__result-icon__halo" cx="60" cy="60" r="52" />
    <circle className="straumur__result-icon__ring" cx="60" cy="60" r="50" pathLength="100" />
    <g className="straumur__result-icon__cross">
      <line
        className="straumur__result-icon__x straumur__result-icon__x--1"
        x1="42"
        y1="42"
        x2="78"
        y2="78"
        pathLength="100"
      />
      <line
        className="straumur__result-icon__x straumur__result-icon__x--2"
        x1="78"
        y1="42"
        x2="42"
        y2="78"
        pathLength="100"
      />
    </g>
  </svg>
);

export default FailureIcon;
