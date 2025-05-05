const getEnv = (): Env => {
  return {
    STAGING_BASE_URL: "https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout",
    PRODUCTION_BASE_URL: "",

    GET_PAYMENT_METHODS_URL: "payment-methods",
    POST_PAYMENT_URL: "payment",
    POST_DETAILS_URL: "details",
    POST_DISABLE_TOKEN_URL: "disable-token",
  };
};

interface Env {
  STAGING_BASE_URL: string;
  PRODUCTION_BASE_URL: string;

  GET_PAYMENT_METHODS_URL: string;
  POST_PAYMENT_URL: string;
  POST_DETAILS_URL: string;
  POST_DISABLE_TOKEN_URL: string;
}

export const env = getEnv();
