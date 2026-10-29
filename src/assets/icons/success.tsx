import { h } from "preact";
import "./result-icons.css";

const SuccessIcon = () => (
  <svg
    className="straumur__result-icon straumur__result-icon--success"
    xmlns="http://www.w3.org/2000/svg"
    width="120"
    height="120"
    viewBox="0 0 120 120"
    role="img"
  >
    <circle className="straumur__result-icon__halo" cx="60" cy="60" r="52" />
    <circle className="straumur__result-icon__ring" cx="60" cy="60" r="50" pathLength="100" />
    <path className="straumur__result-icon__check" d="M37 62 L53 78 L84 44" pathLength="100" />
  </svg>
);

export default SuccessIcon;
