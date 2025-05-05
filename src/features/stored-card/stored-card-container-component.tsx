import { Fragment, h } from "preact";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { StoredPaymentMethod, SuccessResponse } from "../../services/models";
import StoredCardComponent from "./stored-card-component";
import { useState } from "preact/hooks";

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

  if (!storedPaymentMethods || storedPaymentMethods?.length === 0) {
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
