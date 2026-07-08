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
