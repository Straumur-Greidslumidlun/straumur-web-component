import { h } from "preact";
import { StraumurCheckoutConfiguration } from "../models/models";
import { SuccessResponse } from "../services/models";
import CardComponent from "./card/card-component";
import GooglePayComponent from "./google-pay/google-pay-component";
import ApplePayComponent from "./apple-pay/apple-pay-component";
import StoredCardContainerComponent from "./stored-card/stored-card-container-component";
import PaymentMethodGroup from "../components/payment-method-group/payment-method-group";
import ResultComponent from "./result-component/result-component";
import PaymentMethodsWrapper from "./payment-methods-wrapper/payment-methods-wrapper";
import InstantPaymentsComponent from "./instantPayments/instant-payments-component";

interface StraumurCheckoutContainerProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function StraumurCheckoutContainer({ configuration, paymentMethods }: StraumurCheckoutContainerProps): h.JSX.Element {
  return (
    <PaymentMethodGroup initialValue={null}>
      <PaymentMethodsWrapper>
        <InstantPaymentsComponent configuration={configuration} paymentMethods={paymentMethods} />
        <StoredCardContainerComponent configuration={configuration} paymentMethods={paymentMethods} />
        <CardComponent configuration={configuration} paymentMethods={paymentMethods} />
        <GooglePayComponent configuration={configuration} paymentMethods={paymentMethods} />
        <ApplePayComponent configuration={configuration} paymentMethods={paymentMethods} />
      </PaymentMethodsWrapper>

      <ResultComponent />
    </PaymentMethodGroup>
  );
}

export default StraumurCheckoutContainer;
