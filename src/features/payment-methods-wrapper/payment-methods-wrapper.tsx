import { Fragment, h, ComponentChildren } from "preact";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface PaymentMethodsWrapperProps {
  children: ComponentChildren;
}

function PaymentMethodsWrapper({ children }: PaymentMethodsWrapperProps): h.JSX.Element | null {
  const { error, success } = usePaymentMethodGroup();

  if (error || success) {
    return null;
  }

  return <Fragment>{children}</Fragment>;
}

export default PaymentMethodsWrapper;
