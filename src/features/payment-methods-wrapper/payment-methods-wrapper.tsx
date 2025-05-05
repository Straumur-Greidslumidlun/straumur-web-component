import { Fragment, h } from "preact";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface PaymentMethodsWrapperProps {
  children: h.JSX.Element[];
}

function PaymentMethodsWrapper({ children }: PaymentMethodsWrapperProps): h.JSX.Element | null {
  const { error, success, threeDSecureActive } = usePaymentMethodGroup();

  if (error || success || threeDSecureActive) {
    return null;
  }

  return <Fragment>{children}</Fragment>;
}

export default PaymentMethodsWrapper;
