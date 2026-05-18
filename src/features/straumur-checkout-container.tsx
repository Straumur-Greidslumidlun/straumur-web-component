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
import { PaymentMethod } from "../models/constants";

interface StraumurCheckoutContainerProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function determineInitialState(
  hasCard: boolean,
  hasGooglePay: boolean,
  hasApplePay: boolean,
  storedCount: number,
  instantPayments: StraumurCheckoutConfiguration["instantPayments"]
): { initialPaymentMethod: PaymentMethod | null; isSolePaymentMethod: boolean } {
  const gpayInStandard = hasGooglePay && !instantPayments?.some((x) => x === "googlepay");
  const apayInStandard = hasApplePay && !instantPayments?.some((x) => x === "applepay");

  const totalOptions = storedCount + (hasCard ? 1 : 0) + (gpayInStandard ? 1 : 0) + (apayInStandard ? 1 : 0);

  if (totalOptions !== 1) {
    return { initialPaymentMethod: null, isSolePaymentMethod: false };
  }

  if (storedCount === 1) return { initialPaymentMethod: "storedcard", isSolePaymentMethod: true };
  if (hasCard) return { initialPaymentMethod: "card", isSolePaymentMethod: true };
  if (gpayInStandard) return { initialPaymentMethod: "googlepay", isSolePaymentMethod: true };
  if (apayInStandard) return { initialPaymentMethod: "applepay", isSolePaymentMethod: true };

  return { initialPaymentMethod: null, isSolePaymentMethod: false };
}

function StraumurCheckoutContainer({ configuration, paymentMethods }: StraumurCheckoutContainerProps): h.JSX.Element {
  const methods = paymentMethods.paymentMethods.paymentMethods ?? [];
  const stored = paymentMethods.paymentMethods.storedPaymentMethods ?? [];

  const hasCard = methods.some((x) => x.type === "scheme");
  const hasGooglePay = methods.some((x) => x.type === "googlepay");
  const hasApplePay = methods.some((x) => x.type === "applepay");
  const hasStoredPaymentMethods = stored.length > 0;

  const { initialPaymentMethod, isSolePaymentMethod } = determineInitialState(
    hasCard,
    hasGooglePay,
    hasApplePay,
    stored.length,
    configuration.instantPayments
  );

  return (
    <PaymentMethodGroup
      initialValue={initialPaymentMethod}
      isSolePaymentMethod={isSolePaymentMethod}
      hasCard={hasCard}
      hasGooglePay={hasGooglePay}
      hasApplePay={hasApplePay}
      hasStoredPaymentMethods={hasStoredPaymentMethods}
    >
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
