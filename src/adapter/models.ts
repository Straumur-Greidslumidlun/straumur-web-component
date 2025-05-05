export interface IGetPaymentMethodsBody {
  sessionId: string;
}

export interface ICreatePaymentBody {
  sessionId: string;
  origin: string;

  riskData?: {
    clientData: string;
  };
  clientStateDataIndicator: boolean;
  storePaymentMethod?: boolean;

  paymentMethod: {
    [key: string]: any;
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
    [key: string]: any;
  };
}

export interface IPostDisableTokenBody {
  sessionId: string;
  storedPaymentMethodId: string;
}
