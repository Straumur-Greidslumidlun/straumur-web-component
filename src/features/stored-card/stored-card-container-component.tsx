import { Fragment, h } from "preact";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { StoredPaymentMethod, SuccessResponse } from "../../services/models";
import StoredCardComponent from "./stored-card-component";
import { useState } from "preact/hooks";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface StoredCardContainerComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function StoredCardContainerComponent({
  configuration,
  paymentMethods,
}: StoredCardContainerComponentProps): h.JSX.Element | null {
  const [storedPaymentMethods, setStoredPaymentMethods] = useState<StoredPaymentMethod[]>(
    paymentMethods.paymentMethods.storedPaymentMethods ?? []
  );
  const { activePaymentMethod, threeDSecureActive } = usePaymentMethodGroup();

  if (
    !storedPaymentMethods ||
    storedPaymentMethods?.length === 0 ||
    (activePaymentMethod !== "storedcard" && threeDSecureActive) // if threeDSecureActive for some other payment method, do not show stored cards
  ) {
    return null;
  }

  function handleStoredCardRemoved(storedPaymentMethodId: string): void {
    setStoredPaymentMethods((prevStoredPaymentMethods) =>
      prevStoredPaymentMethods.filter((storedPaymentMethod) => storedPaymentMethod.id !== storedPaymentMethodId)
    );
  }

  return (
    <Fragment>
      {storedPaymentMethods?.map((storedPaymentMethod) => (
        <StoredCardComponent
          key={storedPaymentMethod.id}
          configuration={configuration}
          storedPaymentMethod={storedPaymentMethod}
          paymentMethods={paymentMethods}
          onStoredCardRemoved={handleStoredCardRemoved}
        />
      ))}
    </Fragment>
  );
}

export default StoredCardContainerComponent;
