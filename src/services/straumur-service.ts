import { getPaymentMethods } from "../adapter/straumur-adapter";
import { isTranslationKey, TranslationKey } from "../localizations/translations";
import { StraumurCheckoutPaymentMethods, StraumurCheckoutPaymentMethodsResponse } from "./models";

export async function setupPaymentMethods(
  environment: "test" | "live",
  sessionId: string
): Promise<StraumurCheckoutPaymentMethodsResponse> {
  try {
    const fetchResponse = await getPaymentMethods(environment, {
      sessionId,
    });

    if (!fetchResponse.ok) {
      const contentType = fetchResponse.headers.get("content-type");
      let errorMessage: TranslationKey = "error.failedToInitializePaymentMethods";
      if (contentType && contentType.includes("application/json")) {
        // The server's errorMessage is untrusted input: only adopt it when it is a known
        // translation key, otherwise the raw string would be shown to the buyer verbatim.
        const serverErrorMessage: unknown = (await fetchResponse.json()).errorMessage;
        if (isTranslationKey(serverErrorMessage)) {
          errorMessage = serverErrorMessage;
        }
      }

      return {
        resultCode: "Error",
        error: errorMessage,
      };
    }

    const data: StraumurCheckoutPaymentMethods = await fetchResponse.json();

    return {
      resultCode: "Success",
      ...data,
    };
  } catch {
    return {
      resultCode: "Error",
      error: "error.failedToInitializePaymentMethods",
    };
  }
}
