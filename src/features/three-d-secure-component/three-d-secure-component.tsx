import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import "./three-d-secure-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

function StraumurCheckoutContainer(): h.JSX.Element | null {
  const threeDSecureRef = useRef<HTMLDivElement>(null);
  const { setThreeDSecureRef } = usePaymentMethodGroup();

  useEffect(() => {
    if (threeDSecureRef.current) {
      setThreeDSecureRef(threeDSecureRef.current);
    }
  }, []);

  return <div className="straumur__three-d-secure" ref={threeDSecureRef}></div>;
}

export default StraumurCheckoutContainer;
