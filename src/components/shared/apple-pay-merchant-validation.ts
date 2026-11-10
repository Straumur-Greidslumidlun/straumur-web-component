import { ApplePayMerchantSession } from "../../models/models";
import { Logger, NOOP_LOGGER } from "../../logging/component-logger";

type AdyenValidateMerchant = (
  resolve: (session: ApplePayMerchantSession) => void,
  reject: (error: unknown) => void,
  validationURL: string
) => void;

/**
 * Adapts the merchant's promise-based `onApplePayValidateMerchant` to Adyen's `onValidateMerchant(resolve,
 * reject, validationURL)`. Adyen hands `resolve`'s value to Apple's completeMerchantValidation; `reject`
 * aborts the Apple Pay session and raises Adyen's onError (-> the shared failure screen).
 *
 * A synchronous throw and a non-object result are rejections too, so the sheet can never hang waiting.
 */
export function createApplePayMerchantValidation(
  validate: (validationURL: string) => Promise<ApplePayMerchantSession>,
  logger: Logger = NOOP_LOGGER
): AdyenValidateMerchant {
  return (resolve, reject, validationURL) => {
    Promise.resolve()
      .then(() => validate(validationURL))
      .then((session) => {
        if (!session || typeof session !== "object") {
          throw new Error("onApplePayValidateMerchant must resolve with Apple's merchant session object");
        }
        // The outcome only: never the validationURL or the merchant session.
        logger.log("wallet.merchantValidation", { success: true });
        resolve(session);
      })
      .catch((error: unknown) => {
        logger.log("wallet.merchantValidation", { success: false });
        console.error("[StraumurCheckout] onApplePayValidateMerchant failed:", error);
        reject(error);
      });
  };
}
