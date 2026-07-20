import { h, ComponentChildren } from "preact";
import { PaymentMethodGroupContext, SubmitApi } from "./payment-method-group-context";
import "./payment-method-group.css";
import { PaymentMethod } from "../../models/constants";

interface PaymentMethodGroupProps {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
  initialStoredPaymentMethodId?: string | null;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
  onSubmitApiReady?: (api: SubmitApi) => void;
}

function PaymentMethodGroup({
  children,
  initialValue,
  initialStoredPaymentMethodId,
  isSolePaymentMethod,
  hasCard,
  hasGooglePay,
  hasApplePay,
  hasStoredPaymentMethods,
  onSubmitApiReady,
}: PaymentMethodGroupProps): h.JSX.Element | null {
  return (
    <PaymentMethodGroupContext
      initialValue={initialValue}
      initialStoredPaymentMethodId={initialStoredPaymentMethodId}
      isSolePaymentMethod={isSolePaymentMethod}
      hasCard={hasCard}
      hasGooglePay={hasGooglePay}
      hasApplePay={hasApplePay}
      hasStoredPaymentMethods={hasStoredPaymentMethods}
      onSubmitApiReady={onSubmitApiReady}
    >
      <div className="straumur__payment-method-group">{children}</div>
    </PaymentMethodGroupContext>
  );
}

export default PaymentMethodGroup;
