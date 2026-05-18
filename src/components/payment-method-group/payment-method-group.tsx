import { h, ComponentChildren } from "preact";
import { PaymentMethodGroupContext } from "./payment-method-group-context";
import "./payment-method-group.css";
import { PaymentMethod } from "../../models/constants";

interface PaymentMethodGroupProps {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
}

function PaymentMethodGroup({
  children,
  initialValue,
  isSolePaymentMethod,
  hasCard,
  hasGooglePay,
  hasApplePay,
  hasStoredPaymentMethods,
}: PaymentMethodGroupProps): h.JSX.Element | null {
  return (
    <PaymentMethodGroupContext
      initialValue={initialValue}
      isSolePaymentMethod={isSolePaymentMethod}
      hasCard={hasCard}
      hasGooglePay={hasGooglePay}
      hasApplePay={hasApplePay}
      hasStoredPaymentMethods={hasStoredPaymentMethods}
    >
      <div className="straumur__payment-method-group">{children}</div>
    </PaymentMethodGroupContext>
  );
}

export default PaymentMethodGroup;
