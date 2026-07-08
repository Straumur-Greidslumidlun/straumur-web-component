import { PaymentFlow } from "../../models/models";

/** Runs the flow's optional beforeSubmit gate; resolves to whether submission may proceed. */
export async function runBeforeSubmit(paymentFlow: PaymentFlow): Promise<boolean> {
  const { beforeSubmit } = paymentFlow;

  return !beforeSubmit || (await beforeSubmit());
}

/**
 * Card submit-button behavior shared by card-form and stored-card: run the beforeSubmit gate,
 * then submit the Adyen element (re-read after the gate — it may have been torn down while awaiting).
 */
export async function submitCardWithGate(
  paymentFlow: PaymentFlow,
  getElement: () => { submit: () => void } | undefined | null
): Promise<void> {
  if (!getElement()) {
    return;
  }

  if (!(await runBeforeSubmit(paymentFlow))) {
    return;
  }

  getElement()?.submit();
}

// Adyen wallet elements support onClick(resolve, reject) before opening the payment sheet.
// Apple Pay requires resolve() within the user gesture, so keep beforeSubmit synchronous when Apple Pay is offered —
// this handler must NOT be collapsed into the async runBeforeSubmit path.
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
