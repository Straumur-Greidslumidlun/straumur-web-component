import { getPaymentMethods } from "../adapter/straumur-adapter";
import { TranslationKey } from "../localizations/translations";
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
        errorMessage = (await fetchResponse.json()).errorMessage;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      resultCode: "Error",
      error: "error.failedToInitializePaymentMethods",
    };
  }
}
