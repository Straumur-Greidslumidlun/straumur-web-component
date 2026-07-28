export interface IGetPaymentMethodsBody {
  sessionId: string;
}

export interface ICreatePaymentBody {
  sessionId: string;

  riskData?: {
    clientData: string;
  };
  clientStateDataIndicator: boolean;
  storePaymentMethod?: boolean;

  paymentMethod: {
    // Adyen's encrypted card state carries fields we never inspect; keep them opaque.
    [key: string]: unknown;
    checkoutAttemptId?: string;
  };
  browserInfo?: BrowserInfo;
}

interface BrowserInfo {
  acceptHeader: string;
  colorDepth: number;
  language: string;
  javaEnabled: boolean;
  screenHeight: number;
  screenWidth: number;
  userAgent: string;
  timeZoneOffset: number;
}

export interface ICreateDetailsBody {
  sessionId: string;
  // The per-attempt reference the provider redirect appended to the return URL. The backend routes
  // the continuation to the correct provider by this value, so it must be sent on every /details call.
  paymentCheckoutReference?: string;
  details: {
    redirectResult?: string;
    threeDSResult?: string;
    [key: string]: unknown;
  };
}

export interface IPostDisableTokenBody {
  sessionId: string;
  storedPaymentMethodId: string;
}
