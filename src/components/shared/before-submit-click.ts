import { PaymentFlow } from "../../models/models";
import { Logger, NOOP_LOGGER } from "../../logging/component-logger";

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

/** Which logger to report gate decisions to, and the method being paid with (e.g. "card"). */
export interface SubmitLogContext {
  logger: Logger;
  paymentMethod: string;
}

const NO_LOG_CONTEXT: SubmitLogContext = { logger: NOOP_LOGGER, paymentMethod: "" };

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
  lock: SubmissionLock,
  { logger, paymentMethod }: SubmitLogContext = NO_LOG_CONTEXT
): Promise<void> {
  if (!getElement()) {
    logger.log("payment.submitBlocked", { paymentMethod, reason: "noElement" });
    return;
  }

  if (!lock.tryStart()) {
    logger.log("payment.submitBlocked", { paymentMethod, reason: "locked" });
    return;
  }

  let proceed: boolean;
  let threw = false;
  try {
    proceed = await runBeforeSubmit(paymentFlow);
  } catch (error) {
    // A throwing host gate is a host bug; treat it as "not now" and keep the shopper on the form.
    console.error("[StraumurCheckout] onBeforeSubmit threw:", error);
    proceed = false;
    threw = true;
  }

  logger.log("payment.beforeSubmit", { paymentMethod, allowed: proceed, threw });

  // Re-read after the gate — the element may have been torn down while awaiting.
  const element = getElement();

  if (!proceed || !element) {
    lock.release();
    return;
  }

  // An invalid form only shows Adyen's validation errors — onSubmit won't fire, so release now.
  if (element.isValid === false) {
    logger.log("payment.submitBlocked", { paymentMethod, reason: "invalid" });
    lock.release();
  }

  element.submit();
}

// Adyen wallet elements support onClick(resolve, reject) before opening the payment sheet.
// Apple Pay requires resolve() within the user gesture, so keep beforeSubmit synchronous when Apple Pay is offered —
// this handler must NOT be collapsed into the async runBeforeSubmit path.
export function createBeforeSubmitClickHandler(
  paymentFlow: PaymentFlow,
  isLocked: () => boolean = () => false,
  { logger, paymentMethod }: SubmitLogContext = NO_LOG_CONTEXT
) {
  return (resolve: () => void, reject: () => void): void => {
    logger.log("wallet.clicked", { paymentMethod });

    // Another submission is running (e.g. keyboard activation of a visually locked wallet button).
    if (isLocked()) {
      logger.log("payment.submitBlocked", { paymentMethod, reason: "locked" });
      reject();
      return;
    }

    const allow = () => {
      logger.log("payment.beforeSubmit", { paymentMethod, allowed: true, threw: false });
      resolve();
    };
    const deny = (threw: boolean) => {
      logger.log("payment.beforeSubmit", { paymentMethod, allowed: false, threw });
      reject();
    };

    const { beforeSubmit } = paymentFlow;

    if (!beforeSubmit) {
      allow();
      return;
    }

    let result: boolean | Promise<boolean>;
    try {
      result = beforeSubmit();
    } catch (error) {
      console.error("[StraumurCheckout] onBeforeSubmit threw:", error);
      deny(true);
      return;
    }

    if (result instanceof Promise) {
      result.then((valid) => (valid ? allow() : deny(false))).catch(() => deny(true));
      return;
    }

    if (result) {
      allow();
      return;
    }

    deny(false);
  };
}
