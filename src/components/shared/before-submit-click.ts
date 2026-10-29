import { PaymentFlow } from "../../models/models";

/**
 * Synchronous submission lock (see the context's tryStartPayment/setPaymentInProgress). It must be
 * synchronous: a state flag only updates on the next render, so two clicks in the same tick would
 * both get through.
 */
export interface SubmissionLock {
  /** Takes the lock; false if a submission is already running. */
  tryStart: () => boolean;
  release: () => void;
}

/** Runs the flow's optional beforeSubmit gate; resolves to whether submission may proceed. */
export async function runBeforeSubmit(paymentFlow: PaymentFlow): Promise<boolean> {
  const { beforeSubmit } = paymentFlow;

  return !beforeSubmit || (await beforeSubmit());
}

/**
 * The ONE entry point for submitting a card-type element — the built-in pay button, the host's
 * external button (submitCard), and Enter inside the card fields (onEnterKeyPressed) all come here.
 * It runs the beforeSubmit gate exactly once, before Adyen's submit, so handleOnSubmit never has to
 * (a rejection there can't be told apart from a failed payment and would show the failure screen).
 *
 * Never rejects: callers (onClick, triggerSubmit) don't await it.
 */
export async function submitCardWithGate(
  paymentFlow: PaymentFlow,
  getElement: () => { submit: () => void; isValid?: boolean } | undefined | null,
  lock: SubmissionLock
): Promise<void> {
  if (!getElement() || !lock.tryStart()) {
    return;
  }

  let proceed: boolean;
  try {
    proceed = await runBeforeSubmit(paymentFlow);
  } catch (error) {
    // A throwing host gate is a host bug; treat it as "not now" and keep the shopper on the form.
    console.error("[StraumurCheckout] onBeforeSubmit threw:", error);
    proceed = false;
  }

  // Re-read after the gate — the element may have been torn down while awaiting.
  const element = getElement();

  if (!proceed || !element) {
    lock.release();
    return;
  }

  // An invalid form only shows Adyen's validation errors — onSubmit won't fire, so release now.
  if (element.isValid === false) {
    lock.release();
  }

  element.submit();
}

// Adyen wallet elements support onClick(resolve, reject) before opening the payment sheet.
// Apple Pay requires resolve() within the user gesture, so keep beforeSubmit synchronous when Apple Pay is offered —
// this handler must NOT be collapsed into the async runBeforeSubmit path.
export function createBeforeSubmitClickHandler(paymentFlow: PaymentFlow, isLocked: () => boolean = () => false) {
  return (resolve: () => void, reject: () => void): void => {
    // Another submission is running (e.g. keyboard activation of a visually locked wallet button).
    if (isLocked()) {
      reject();
      return;
    }

    const { beforeSubmit } = paymentFlow;

    if (!beforeSubmit) {
      resolve();
      return;
    }

    let result: boolean | Promise<boolean>;
    try {
      result = beforeSubmit();
    } catch (error) {
      console.error("[StraumurCheckout] onBeforeSubmit threw:", error);
      reject();
      return;
    }

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
