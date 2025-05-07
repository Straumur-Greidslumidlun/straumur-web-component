import { h, ComponentChildren } from "preact";
import { PaymentMethodGroupContext } from "./payment-method-group-context";
import "./payment-method-group.css";
import { PaymentMethod } from "../../models/constants";

interface PaymentMethodGroupProps {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
}

function PaymentMethodGroup({ children, initialValue }: PaymentMethodGroupProps): h.JSX.Element | null {
  return (
    <PaymentMethodGroupContext initialValue={initialValue}>
      <div className="straumur__payment-method-group">{children}</div>
    </PaymentMethodGroupContext>
  );
}

export default PaymentMethodGroup;
