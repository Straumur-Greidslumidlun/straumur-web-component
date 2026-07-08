import { PaymentFlow } from "../../models/models";

// Adyen wallet elements support onClick(resolve, reject) before opening the payment sheet.
// Apple Pay requires resolve() within the user gesture, so keep beforeSubmit synchronous when Apple Pay is offered.
export function createBeforeSubmitClickHandler(paymentFlow: PaymentFlow) {
  return (resolve: () => void, reject: () => void): void => {
    const { beforeSubmit } = paymentFlow;

    if (!beforeSubmit) {
      resolve();
      return;
    }

    const result = beforeSubmit();

    if (result instanceof Promise) {
      result.then((valid) => (valid ? resolve() : reject())).catch(() => reject());
      return;
    }

    if (result) {
      resolve();
      return;
    }

    reject();
  };
}
