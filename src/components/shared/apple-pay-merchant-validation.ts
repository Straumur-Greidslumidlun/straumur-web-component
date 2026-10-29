import { ApplePayMerchantSession } from "../../models/models";

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
  validate: (validationURL: string) => Promise<ApplePayMerchantSession>
): AdyenValidateMerchant {
  return (resolve, reject, validationURL) => {
    Promise.resolve()
      .then(() => validate(validationURL))
      .then((session) => {
        if (!session || typeof session !== "object") {
          throw new Error("onApplePayValidateMerchant must resolve with Apple's merchant session object");
        }
        resolve(session);
      })
      .catch((error: unknown) => {
        console.error("[StraumurCheckout] onApplePayValidateMerchant failed:", error);
        reject(error);
      });
  };
}
