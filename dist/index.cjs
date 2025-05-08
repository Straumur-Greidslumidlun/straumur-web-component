"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  StraumurCheckout: () => straumur_checkout_default
});
module.exports = __toCommonJS(index_exports);

// src/straumur-checkout.tsx
var import_preact32 = require("preact");
var import_adyen = require("@adyen/adyen-web/styles/adyen.css");

// #style-inject:#style-inject
function styleInject(css, { insertAt } = {}) {
  if (!css || typeof document === "undefined") return;
  const head = document.head || document.getElementsByTagName("head")[0];
  const style = document.createElement("style");
  style.type = "text/css";
  if (insertAt === "top") {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

// src/styles/main.css
styleInject(':root {\n  --straumur__color-primary: #002649;\n  --straumur__color-secondary: #72889d;\n  --straumur__color-secondary-gamma: #eef0f2;\n  --straumur__color-blue-beta: #bce6f3;\n  --straumur__color-blue-gamma: #eff8fa;\n  --straumur__color-red-beta: #d96666;\n  --straumur__color-red-gamma: #fff8f5;\n  --straumur__color-gray-epsilon: #e7e7e7;\n  --straumur__color-cosmos-blue-delta: #cdd8e2;\n  --straumur__color-cosmos-blue-gamma: #e6ebef;\n  --straumur__color-white: #ffffff;\n  --straumur__color-transparent: transparent;\n  --straumur__border-radius-xxs: 4px;\n  --straumur__border-radius-xs: 6px;\n  --straumur__border-radius-s: 8px;\n  --straumur__border-radius-md: 10px;\n  --straumur__border-radius-lg: 12px;\n  --straumur__border-radius-xlg: 14px;\n  --straumur__border-radius-xxlg: 16px;\n  --straumur__space-xxs: 4px;\n  --straumur__space-xs: 6px;\n  --straumur__space-s: 8px;\n  --straumur__space-md: 10px;\n  --straumur__space-lg: 12px;\n  --straumur__space-xlg: 14px;\n  --straumur__space-xxlg: 16px;\n  --straumur__space-3xlg: 18px;\n  --straumur__space-4xlg: 20px;\n  --straumur__space-5xlg: 24px;\n}\n.straumur__root-component {\n  font-family: "AkzidenzGroteskPro", sans-serif;\n  max-width: 440px;\n  min-width: 320px;\n}\n.straumur__component * {\n  font-family: inherit;\n}\n.straumur__render-brand-icons__overflow {\n  color: #72889d;\n}\n.straumur__component {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  height: 300px;\n  background-color: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-xxlg);\n}\n');

// src/env.ts
var getEnv = () => {
  return {
    STAGING_BASE_URL: "https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout",
    PRODUCTION_BASE_URL: "",
    GET_PAYMENT_METHODS_URL: "payment-methods",
    POST_PAYMENT_URL: "payment",
    POST_DETAILS_URL: "details",
    POST_DISABLE_TOKEN_URL: "disable-token"
  };
};
var env = getEnv();

// src/adapter/straumur-adapter.ts
function getBaseUrl(environment) {
  switch (environment) {
    case "test":
      return env.STAGING_BASE_URL;
    case "live":
      return env.PRODUCTION_BASE_URL;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}
function getPaymentMethods(environment, body) {
  return fetch(`${getBaseUrl(environment)}/${env.GET_PAYMENT_METHODS_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
function createPaymentRequest(environment, body) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_PAYMENT_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
function createDetailsRequest(environment, body) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_DETAILS_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
function postDisableTokenRequest(environment, body) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_DISABLE_TOKEN_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

// src/services/straumur-service.ts
async function setupPaymentMethods(environment, sessionId) {
  try {
    const fetchResponse = await getPaymentMethods(environment, {
      sessionId
    });
    if (!fetchResponse.ok) {
      const contentType = fetchResponse.headers.get("content-type");
      let errorMessage = "error.failedToInitializePaymentMethods";
      if (contentType && contentType.includes("application/json")) {
        errorMessage = (await fetchResponse.json()).errorMessage;
      }
      return {
        resultCode: "Error",
        error: errorMessage
      };
    }
    const data = await fetchResponse.json();
    return {
      resultCode: "Success",
      ...data
    };
  } catch (error) {
    return {
      resultCode: "Error",
      error: "error.failedToInitializePaymentMethods"
    };
  }
}

// src/features/straumur-checkout-container.tsx
var import_preact31 = require("preact");

// src/features/card/card-component.tsx
var import_preact17 = require("preact");
var import_hooks4 = require("preact/hooks");

// src/features/card/card-component.css
styleInject('.straumur__card-component {\n  position: relative;\n  cursor: pointer;\n  background: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-lg);\n  transition: all 0.3s ease;\n  padding: var(--straumur__space-xxlg) var(--straumur__space-5xlg);\n}\n.straumur__card-component__radio-selector {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n}\n.straumur__card-component__content {\n  display: grid;\n  grid-template-columns: 26px 40px auto 1fr;\n  align-items: center;\n  gap: var(--straumur__space-lg);\n  transition: background-color 0.3s ease;\n}\n.straumur__card-component__radio-selector:checked + .straumur__card-component__content {\n  padding-bottom: var(--straumur__space-xxlg);\n}\n.straumur__card-component--circle {\n  width: var(--straumur__space-5xlg);\n  height: var(--straumur__space-5xlg);\n  border: 1px solid var(--straumur__color-cosmos-blue-gamma);\n  background: var(--straumur__color-secondary-gamma);\n  border-radius: 50%;\n  position: relative;\n  transition: all 0.3s ease;\n}\n.straumur__card-component__content:hover .straumur__card-component--circle {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__card-component--circle::after {\n  content: "";\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%) scale(0);\n  transition: transform 0.2s ease;\n}\n.straumur__card-component__radio-selector:checked + .straumur__card-component__content .straumur__card-component--circle {\n  background: var(--straumur__color-blue-beta);\n  border-color: var(--straumur__color-transparent);\n}\n.straumur__card-component__radio-selector:checked + .straumur__card-component__content .straumur__card-component--circle::after {\n  transform: translate(-50%, -50%) scale(1);\n  background: var(--straumur__color-primary);\n  height: var(--straumur__space-md);\n  width: var(--straumur__space-md);\n}\n.straumur__card-component--text {\n  color: #213547;\n  font-size: 1rem;\n  user-select: none;\n}\n.straumur__card-component--brands {\n  display: flex;\n  margin-left: auto;\n  align-items: center;\n  gap: var(--straumur__space-xxs);\n}\n.straumur__card-component__expandable {\n  background: var(--straumur__color-white);\n  max-height: 0;\n  overflow: hidden;\n  transition: all 0.3s ease;\n  opacity: 0;\n}\n.straumur__card-component__loading-text {\n  display: flex;\n  justify-content: center;\n}\n.straumur__card-component__radio-selector:checked ~ .straumur__card-component__expandable {\n  max-height: 400px;\n  opacity: 1;\n}\n.straumur__card-component__form {\n  display: flex;\n  padding-top: var(--straumur__space-xxlg);\n  flex-direction: column;\n  gap: var(--straumur__space-5xlg);\n}\n.straumur__card-component__form--wrapper {\n  display: flex;\n  flex-direction: column;\n  justify-items: start;\n  position: relative;\n  width: 100%;\n}\n.straumur__card-component__form--wrapper--error {\n  color: var(--straumur__color-red-beta);\n  font-size: 12px;\n}\n.straumur__card-component__form--wrapper--label {\n  transform: translateX(var(--straumur__space-md)) translateY(-50%);\n  z-index: 1;\n  background:\n    linear-gradient(\n      to top,\n      var(--straumur__color-secondary-gamma) 53%,\n      var(--straumur__color-transparent) 50%);\n  position: absolute;\n  font-weight: 500;\n  font-size: 14px;\n  padding: 0 var(--straumur__space-xxs);\n}\n.straumur__card-component__form--wrapper--label--error {\n  color: var(--straumur__color-red-beta);\n  background:\n    linear-gradient(\n      to top,\n      var(--straumur__color-red-gamma) 53%,\n      var(--straumur__color-transparent) 50%);\n}\n.straumur__card-component__form--wrapper--label--info {\n  position: absolute;\n  top: 33%;\n  right: var(--straumur__space-md);\n}\n.straumur__card-component__form--wrapper--input {\n  background: var(--straumur__color-secondary-gamma);\n  color: #00112c;\n  display: block;\n  font-family: inherit;\n  border: 1px solid var(--straumur__color-transparent);\n  border-radius: var(--straumur__border-radius-s);\n  font-size: 1rem;\n  height: 48px;\n  outline: none;\n  padding-left: var(--straumur__space-lg);\n  transition: border 0.2s ease-out, box-shadow 0.2s ease-out;\n}\n.straumur__card-component__form--wrapper--input:hover {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__card-component__form--wrapper--input--error {\n  background: var(--straumur__color-red-gamma);\n  border: 1px solid var(--straumur__color-red-beta);\n}\n.straumur__card-component__form--wrapper--input--error:hover {\n  border: 1px solid var(--straumur__color-red-beta);\n}\n.straumur__card-component__form--field-wrapper {\n  display: flex;\n  width: 100%;\n  gap: var(--straumur__space-5xlg);\n}\n.straumur__card-component__submit-button {\n  background: var(--straumur__color-primary);\n  border: none;\n  border-radius: var(--straumur__border-radius-s);\n  color: var(--straumur__color-white);\n  cursor: pointer;\n  font-size: 1rem;\n  height: 40px;\n  outline: none;\n  padding: 0 var(--straumur__space-xxlg);\n  transition: background 0.2s ease-out;\n  width: 100%;\n}\n.straumur__card-component__submit-button:hover {\n  background: var(--straumur__color-primary);\n  border: 1px solid #dbdee2;\n}\n.straumur__card-component__submit-button:disabled {\n  background: #72889d;\n  border: 1px solid #dbdee2;\n  cursor: not-allowed;\n}\n.straumur__card-component__form--wrapper--label-checkbox {\n  height: 38px;\n  display: flex;\n  align-items: center;\n  padding: 8px;\n  gap: var(--straumur__space-s);\n  border-radius: var(--straumur__border-radius-s);\n  cursor: pointer;\n  user-select: none;\n  transition: background-color 0.25s ease-in-out;\n}\n.straumur__card-component__form--wrapper--label-checkbox:hover {\n  background-color: var(--straumur__color-blue-gamma);\n}\n.straumur__card-component__form--wrapper--label-checkbox:hover .straumur__card-component__form--wrapper--label-checkbox--checkmark {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__card-component__form--wrapper--label-checkbox--checkmark {\n  height: var(--straumur__space-5xlg);\n  width: var(--straumur__space-5xlg);\n  background-color: var(--straumur__color-secondary-gamma);\n  border-radius: var(--straumur__border-radius-xxs);\n  flex-shrink: 0;\n  border: 1px solid var(--straumur__color-transparent);\n  transition: all 0.2s ease-in;\n}\n.straumur__card-component__form--wrapper--label-checkbox:hover .straumur__card-component__form--wrapper--label-checkbox--checkmark.straumur__card-component__form--wrapper--label-checkbox--checkmark--checked {\n  border: 1px solid var(--straumur__color-transparent);\n}\n.straumur__card-component__form--wrapper--label-checkbox--checkmark--checked {\n  background-color: var(--straumur__color-blue-beta);\n}\n.straumur__card-component__form--wrapper--label-checkbox--checkmark--icon {\n  height: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  font-size: 9px;\n  opacity: 0;\n  visibility: hidden;\n  transition: all 0.2s ease-in;\n}\n.straumur__card-component__form--wrapper--label-checkbox--checkmark--icon--checked {\n  opacity: 1;\n  visibility: visible;\n}\n.straumur__card-component__form--wrapper--label-checkbox--checkbox {\n  display: none;\n}\n');

// src/components/payment-method-group/payment-method-group-context.tsx
var import_preact = require("preact");
var import_preact2 = require("preact");
var import_hooks = require("preact/hooks");
var PaymentMethodContext = (0, import_preact2.createContext)(void 0);
var defaultIsInitialized = {
  card: false,
  storedcard: false,
  googlepay: false,
  applepay: false
};
var PaymentMethodGroupContext = ({
  children,
  initialValue
}) => {
  const [activePaymentMethod, setActivePaymentMethod] = (0, import_hooks.useState)(initialValue);
  const [activeStoredPaymentMethodId, setActiveStoredPaymentMethodId] = (0, import_hooks.useState)(null);
  const [threeDSecureActive, setThreeDSecureActive] = (0, import_hooks.useState)(false);
  const [isPaymentMethodInitialized, setIsPaymentMethodInitialized] = (0, import_hooks.useState)(defaultIsInitialized);
  const [isStoredCardInitialized, setIsStoredCardInitialized] = (0, import_hooks.useState)({});
  const threeDSecureRef = (0, import_hooks.useRef)(null);
  const [success, setSuccess] = (0, import_hooks.useState)(null);
  const [error, setError] = (0, import_hooks.useState)(null);
  const updatePaymentMethodInitialization = (paymentMethod, isInitialized) => {
    setIsPaymentMethodInitialized((prevState) => ({
      ...prevState,
      [paymentMethod]: isInitialized
    }));
  };
  const updateStoredCardInitialization = (storedPaymentMethod, isInitialized) => {
    setIsStoredCardInitialized((prevState) => ({
      ...prevState,
      [storedPaymentMethod]: isInitialized
    }));
  };
  const handleError = (error2) => {
    setError(error2);
  };
  const handleSuccess = (success2) => {
    setSuccess(success2);
  };
  const setThreeDSecureRef = (ref) => {
    threeDSecureRef.current = ref;
  };
  return /* @__PURE__ */ (0, import_preact.h)(
    PaymentMethodContext.Provider,
    {
      value: {
        activePaymentMethod,
        setActivePaymentMethod,
        activeStoredPaymentMethodId,
        setActiveStoredPaymentMethodId,
        isPaymentMethodInitialized,
        updatePaymentMethodInitialization,
        isStoredCardInitialized,
        updateStoredCardInitialization,
        handleSuccess,
        success,
        handleError,
        error,
        threeDSecureRef,
        setThreeDSecureRef,
        threeDSecureActive,
        setThreeDSecureActive
      }
    },
    children
  );
};
var usePaymentMethodGroup = () => {
  const context = (0, import_hooks.useContext)(PaymentMethodContext);
  if (context === void 0) {
    throw new Error("usePaymentMethodGroup must be used within a PaymentMethodGroup");
  }
  return context;
};

// src/features/card/card-component.tsx
var import_adyen_web = require("@adyen/adyen-web");

// src/localizations/translations.ts
var translations = {
  "en-US": {
    "cards.title": "Card payment",
    "cards.cardNumber": "Card number",
    "cards.expiryDate": "Expiry date",
    "cards.securityCode3Digits": "Security code",
    "cards.securityCode3DigitsOptional": "Security code (optional)",
    "cards.securityCode3DigitsInfo": "3-digit on the back of the card",
    "cards.securityCode4DigitsInfo": "4-digit on the back of the card",
    "cards.storePaymentMethod": "Store payment information",
    "googlePay.title": "Google Pay",
    "applePay.title": "Apple Pay",
    "stored-cards.expiryDate": "Expiry date",
    "stored-cards.securityCode3Digits": "Security code",
    "stored-cards.securityCode3DigitsOptional": "Security code (optional)",
    "stored-cards.securityCode3DigitsInfo": "3-digit on the back of the card",
    "stored-cards.securityCode4DigitsInfo": "4-digit on the back of the card",
    "stored-cards.removeStoredCard": "Remove",
    "stored-cards.removeStoredCardQuestion": "Remove stored payment method?",
    "stored-cards.removeStoredCardQuestionYesRemove": "Yes, remove",
    "stored-cards.removeStoredCardQuestionCancel": "Cancel",
    "success.paymentAuthorized": "Payment authorized",
    "error.unknownError": "Unknown error occurred",
    "error.failedToInitializeStraumurWebComponent": "Failed to initialize Straumur Web component",
    "error.failedToInitializePaymentMethods": "Failed to initialize payment methods",
    "error.failedToSubmitPayment": "Failed to submit payment",
    "error.paymentFailed": "Payment failed",
    "error.paymentUnsuccessful": "Payment unsuccessful",
    "error.failedToSubmitPaymentDetails": "Failed to submit payment details",
    "error.paymentDetailsFailed": "Payment details failed",
    "error.googlePayNotAvailable": "Google Pay not available",
    "error.applePayNotAvailable": "Apple Pay not available",
    "error.failedToSubmitRemoveStoredPaymentCard": "Failed to remove stored payment card",
    "error.failedToRemoveStoredPaymentCard": "Stored payment card was not removed"
  },
  "is-IS": {
    "cards.title": "Grei\xF0a me\xF0 korti",
    "cards.cardNumber": "Kortan\xFAmer",
    "cards.expiryDate": "Gildisdagur",
    "cards.securityCode3Digits": "\xD6ryggisk\xF3\xF0i",
    "cards.securityCode3DigitsOptional": "\xD6ryggisk\xF3\xF0i (valkv\xE6tt)",
    "cards.securityCode3DigitsInfo": "3 t\xF6lustafir aftan \xE1 kortinu",
    "cards.securityCode4DigitsInfo": "4 t\xF6lustafir aftan \xE1 kortinu",
    "cards.storePaymentMethod": "Vista grei\xF0sluuppl\xFDsingar",
    "googlePay.title": "Google Pay",
    "applePay.title": "Apple Pay",
    "stored-cards.expiryDate": "Gildisdagur",
    "stored-cards.securityCode3Digits": "\xD6ryggisk\xF3\xF0i",
    "stored-cards.securityCode3DigitsOptional": "\xD6ryggisk\xF3\xF0i (valkv\xE6tt)",
    "stored-cards.securityCode3DigitsInfo": "3 t\xF6lustafir aftan \xE1 kortinu",
    "stored-cards.securityCode4DigitsInfo": "4 t\xF6lustafir aftan \xE1 kortinu",
    "stored-cards.removeStoredCard": "Fjarl\xE6gja",
    "stored-cards.removeStoredCardQuestion": "Fjarl\xE6gja geymdan grei\xF0slum\xE1ta?",
    "stored-cards.removeStoredCardQuestionYesRemove": "J\xE1, fjarl\xE6gja",
    "stored-cards.removeStoredCardQuestionCancel": "H\xE6tta vi\xF0",
    "success.paymentAuthorized": "Grei\xF0sla sam\xFEykkt",
    "error.unknownError": "\xD3\xFEekkt villa kom upp",
    "error.failedToInitializeStraumurWebComponent": "Mist\xF3kst a\xF0 s\xE6kja Straumur Web hluta",
    "error.failedToInitializePaymentMethods": "Mist\xF3kst a\xF0 s\xE6kja grei\xF0slum\xE1ta",
    "error.failedToSubmitPayment": "Mist\xF3kst a\xF0 senda grei\xF0slu",
    "error.paymentFailed": "Grei\xF0sla mist\xF3kst",
    "error.paymentUnsuccessful": "Grei\xF0sla ekki tekin",
    "error.failedToSubmitPaymentDetails": "Mist\xF3kst a\xF0 senda grei\xF0sluuppl\xFDsingar",
    "error.paymentDetailsFailed": "Mist\xF3kst a\xF0 s\xE6kja grei\xF0sluuppl\xFDsingar",
    "error.googlePayNotAvailable": "Google Pay ekki \xED bo\xF0i",
    "error.applePayNotAvailable": "Apple Pay ekki \xED bo\xF0i",
    "error.failedToSubmitRemoveStoredPaymentCard": "Mist\xF3kst a\xF0 fjarl\xE6gja geymdan grei\xF0slum\xE1ta",
    "error.failedToRemoveStoredPaymentCard": "Geymdur grei\xF0slum\xE1ti var ekki fjarl\xE6g\xF0ur"
  }
};

// src/localizations/i18n.ts
function i18n(language, key) {
  return translations[language][key] || key;
}

// src/components/tooltip/tooltip.tsx
var import_preact3 = require("preact");

// src/components/tooltip/tooltip.css
styleInject(".straumur__tooltip__content {\n  position: absolute;\n  z-index: 50;\n  padding: var(--straumur__space-s);\n  border-radius: var(--straumur__border-radius-s);\n  right: 40%;\n  top: 100%;\n  width: max-content;\n  color: var(--straumur__color-white);\n  background-color: var(--straumur__color-primary);\n  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);\n}\n");

// src/components/tooltip/tooltip.tsx
var import_hooks2 = require("preact/hooks");
var Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = (0, import_hooks2.useState)(false);
  const triggerRef = (0, import_hooks2.useRef)(null);
  const handleMouseEnter = () => {
    setIsVisible(true);
  };
  const handleMouseLeave = () => {
    setIsVisible(false);
  };
  return /* @__PURE__ */ (0, import_preact3.h)("div", { style: { position: "relative" } }, /* @__PURE__ */ (0, import_preact3.h)("div", { ref: triggerRef, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }, children), isVisible && triggerRef && /* @__PURE__ */ (0, import_preact3.h)("div", { className: "straumur__tooltip__content" }, content));
};

// src/assets/icons/card.tsx
var import_preact4 = require("preact");
var CardIcon = () => /* @__PURE__ */ (0, import_preact4.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none"
  },
  /* @__PURE__ */ (0, import_preact4.h)("path", { d: "M24 11H0V7H24V11Z", fill: "#002649" }),
  /* @__PURE__ */ (0, import_preact4.h)(
    "path",
    {
      opacity: "0.4",
      d: "M21.3333 3C22.8042 3 24 4.19375 24 5.66667V7H0V5.66667C0 4.19375 1.19375 3 2.66667 3H21.3333ZM24 19C24 20.4708 22.8042 21.6667 21.3333 21.6667H2.66667C1.19375 21.6667 0 20.4708 0 19V11H24V19ZM4.66667 16.3333C4.3 16.3333 4 16.6333 4 17C4 17.3667 4.3 17.6667 4.66667 17.6667H7.33333C7.7 17.6667 8 17.3667 8 17C8 16.6333 7.7 16.3333 7.33333 16.3333H4.66667ZM10 17.6667H15.3333C15.7 17.6667 16 17.3667 16 17C16 16.6333 15.7 16.3333 15.3333 16.3333H10C9.63333 16.3333 9.33333 16.6333 9.33333 17C9.33333 17.3667 9.63333 17.6667 10 17.6667Z",
      fill: "#002649"
    }
  )
);
var card_default = CardIcon;

// src/assets/icons/info.tsx
var import_preact5 = require("preact");
var InfoIcon = () => /* @__PURE__ */ (0, import_preact5.h)("svg", { width: "21", height: "20", viewBox: "0 0 21 20", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ (0, import_preact5.h)("g", { "clip-path": "url(#clip0_10626_39119)" }, /* @__PURE__ */ (0, import_preact5.h)(
  "path",
  {
    d: "M10.6641 7.5C11.3543 7.5 11.9141 6.94023 11.9141 6.25C11.9141 5.55977 11.3543 5 10.6641 5C9.97383 5 9.41406 5.55859 9.41406 6.25C9.41406 6.94141 9.97266 7.5 10.6641 7.5ZM12.2266 13.125H11.6016V9.6875C11.6016 9.17188 11.1836 8.75 10.6641 8.75H9.41406C8.89844 8.75 8.47656 9.17188 8.47656 9.6875C8.47656 10.2031 8.89844 10.625 9.41406 10.625H9.72656V13.125H9.10156C8.58594 13.125 8.16406 13.5469 8.16406 14.0625C8.16406 14.5781 8.58594 15 9.10156 15H12.2266C12.7441 15 13.1641 14.5801 13.1641 14.0625C13.1641 13.5449 12.7461 13.125 12.2266 13.125Z",
    fill: "#002649"
  }
), /* @__PURE__ */ (0, import_preact5.h)(
  "path",
  {
    opacity: "0.4",
    d: "M10.6641 0C5.14062 0 0.664062 4.47656 0.664062 10C0.664062 15.5234 5.14062 20 10.6641 20C16.1875 20 20.6641 15.5234 20.6641 10C20.6641 4.47656 16.1875 0 10.6641 0ZM10.6641 5C11.3543 5 11.9141 5.55977 11.9141 6.25C11.9141 6.94023 11.3543 7.5 10.6641 7.5C9.97383 7.5 9.41406 6.94141 9.41406 6.25C9.41406 5.55859 9.97266 5 10.6641 5ZM12.2266 15H9.10156C8.58594 15 8.16406 14.582 8.16406 14.0625C8.16406 13.543 8.58398 13.125 9.10156 13.125H9.72656V10.625H9.41406C8.89648 10.625 8.47656 10.2051 8.47656 9.6875C8.47656 9.16992 8.89844 8.75 9.41406 8.75H10.6641C11.1816 8.75 11.6016 9.16992 11.6016 9.6875V13.125H12.2266C12.7441 13.125 13.1641 13.5449 13.1641 14.0625C13.1641 14.5801 12.7461 15 12.2266 15Z",
    fill: "#002649"
  }
)), /* @__PURE__ */ (0, import_preact5.h)("defs", null, /* @__PURE__ */ (0, import_preact5.h)("clipPath", { id: "clip0_10626_39119" }, /* @__PURE__ */ (0, import_preact5.h)("rect", { width: "20", height: "20", fill: "white", transform: "translate(0.664062)" }))));
var info_default = InfoIcon;

// src/utils/renderBrandIcons.tsx
var import_preact14 = require("preact");

// src/assets/icons/mastercard.tsx
var import_preact6 = require("preact");
var MasterCardIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact6.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    viewBox: "0 0 40 26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact6.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" }),
  /* @__PURE__ */ (0, import_preact6.h)("path", { fill: "#F06022", d: "M16.13 19.29h7.74V6.7h-7.74v12.58z" }),
  /* @__PURE__ */ (0, import_preact6.h)(
    "path",
    {
      fill: "#EA1D25",
      d: "M16.93 13A7.93 7.93 0 0 1 20 6.71a8.02 8.02 0 0 0-10.65.65 7.96 7.96 0 0 0 0 11.28 8.02 8.02 0 0 0 10.65.65A8.02 8.02 0 0 1 16.93 13"
    }
  ),
  /* @__PURE__ */ (0, import_preact6.h)(
    "path",
    {
      fill: "#F79D1D",
      d: "M33 13c0 2.12-.84 4.15-2.34 5.65a8.1 8.1 0 0 1-10.66.64A8.05 8.05 0 0 0 23.07 13 7.96 7.96 0 0 0 20 6.71a8.02 8.02 0 0 1 10.66.64A7.93 7.93 0 0 1 33 13"
    }
  )
);
var mastercard_default = MasterCardIcon;

// src/assets/icons/visa.tsx
var import_preact7 = require("preact");
var VisaIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact7.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    fill: "none",
    viewBox: "0 0 40 26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact7.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" }),
  /* @__PURE__ */ (0, import_preact7.h)(
    "path",
    {
      fill: "#1434CB",
      d: "m15.9 7.7-4.43 10.6h-2.9l-2.2-8.47c-.13-.52-.25-.71-.65-.93C5.05 8.55 3.96 8.2 3 8l.07-.32h4.67c.6 0 1.13.4 1.27 1.09l1.15 6.14 2.86-7.23h2.89Zm11.39 7.15c0-2.8-3.88-2.96-3.85-4.21 0-.38.37-.79 1.16-.9a5.2 5.2 0 0 1 2.71.48l.48-2.25a7.4 7.4 0 0 0-2.57-.47c-2.71 0-4.62 1.44-4.64 3.51-.02 1.53 1.36 2.38 2.4 2.9 1.08.51 1.44.85 1.43 1.31 0 .71-.85 1.03-1.64 1.04-1.39.02-2.19-.37-2.82-.67l-.5 2.33c.64.29 1.82.55 3.05.56 2.89 0 4.78-1.42 4.79-3.63Zm7.17 3.46H37L34.78 7.7h-2.34c-.53 0-.98.3-1.17.78l-4.12 9.84h2.88l.57-1.58h3.53l.33 1.58Zm-3.07-3.76 1.45-3.99.83 4H31.4ZM19.83 7.7l-2.27 10.62h-2.74L17.09 7.7h2.74Z"
    }
  )
);
var visa_default = VisaIcon;

// src/assets/icons/maestro.tsx
var import_preact8 = require("preact");
var MaestroIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact8.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    fill: "none",
    viewBox: "0 0 40 26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact8.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" }),
  /* @__PURE__ */ (0, import_preact8.h)("path", { fill: "#7773B4", d: "M16.13 19.29h7.74V6.7h-7.74v12.58z" }),
  /* @__PURE__ */ (0, import_preact8.h)(
    "path",
    {
      fill: "#EA1D25",
      d: "M16.93 13A7.93 7.93 0 0 1 20 6.71a8.02 8.02 0 0 0-10.65.65 7.96 7.96 0 0 0 0 11.28 8.02 8.02 0 0 0 10.65.65A8.02 8.02 0 0 1 16.93 13"
    }
  ),
  /* @__PURE__ */ (0, import_preact8.h)(
    "path",
    {
      fill: "#139FDA",
      d: "M33 13c0 2.12-.84 4.15-2.34 5.65a8.1 8.1 0 0 1-10.66.64A8.05 8.05 0 0 0 23.07 13 7.96 7.96 0 0 0 20 6.71a8.02 8.02 0 0 1 10.66.64A7.93 7.93 0 0 1 33 13"
    }
  )
);
var maestro_default = MaestroIcon;

// src/assets/icons/amex.tsx
var import_preact9 = require("preact");
var AmexIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact9.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 40 26",
    width: "40",
    height: "26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact9.h)("path", { fill: "#016FD0", d: "M0 26h40V0H0v26z" }),
  /* @__PURE__ */ (0, import_preact9.h)(
    "path",
    {
      fill: "#fff",
      "fill-rule": "evenodd",
      d: "M30.69 13.63v1.64h-4.17v1.14h4.07v1.64h-4.07v1.12h4.17v1.66l3.38-3.6-3.38-3.6zm-1.1-6.14-1.4-3.19h-4l-4.1 9.32h3.33v8.27l10.28.01 1.61-1.8 1.63 1.8H40v-2.63l-1.92-2.06L40 15.16v-2.59l-1.93.01V7.6l-1.81 4.98H34.5l-1.86-5v5h-4.2l-.6-1.46h-3.3l-.6 1.46h-2.22l3.23-7.27V5.3h2.55l3.19 7.21V5.3l3.1.01 1.6 4.47 1.62-4.48H40v-1h-3.77l-.85 2.39-.85-2.39h-4.94v3.19zm-5.06 6.11v7.27h6.16v-.01h2.54l2.1-2.32 2.12 2.32H40v-.1l-3.34-3.53L40 13.65v-.05h-2.52l-2.1 2.3-2.08-2.3h-8.77zm.7-4.11.96-2.31.97 2.31h-1.93z"
    }
  )
);
var amex_default = AmexIcon;

// src/assets/icons/jcb.tsx
var import_preact10 = require("preact");
var JcbIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact10.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    fill: "none",
    viewBox: "0 0 40 26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact10.h)("g", { "clip-path": "url(#a)" }, /* @__PURE__ */ (0, import_preact10.h)("path", { fill: "#fff", d: "M0 0h40v26H0V0Z" }), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "#fff",
      d: "M36.6 20.66a5.22 5.22 0 0 1-5.22 5.22H3V5.22A5.22 5.22 0 0 1 8.22 0H36.6v20.66Z"
    }
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "url(#b)",
      d: "M27.36 15.36h2.15l.27-.02a.96.96 0 0 0 .76-.96 1 1 0 0 0-.76-.97c-.06-.02-.19-.02-.27-.02h-2.15v1.97Z"
    }
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "url(#c)",
      d: "M29.27 1.75a3.74 3.74 0 0 0-3.74 3.73v3.89h5.28c.12 0 .26 0 .37.02 1.19.06 2.07.67 2.07 1.74 0 .84-.6 1.56-1.7 1.7v.05c1.2.08 2.13.76 2.13 1.8 0 1.13-1.03 1.87-2.38 1.87h-5.8v7.6H31a3.74 3.74 0 0 0 3.73-3.74V1.75h-5.46Z"
    }
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "url(#d)",
      d: "M30.27 11.38c0-.5-.35-.82-.76-.89l-.2-.02h-1.95v1.81h1.95c.06 0 .18 0 .2-.02a.87.87 0 0 0 .76-.88Z"
    }
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "url(#e)",
      d: "M8.6 1.75a3.74 3.74 0 0 0-3.73 3.73v9.22a7.4 7.4 0 0 0 3.22.85c1.3 0 2-.78 2-1.85V9.34h3.2v4.34c0 1.68-1.05 3.06-4.6 3.06-2.16 0-3.84-.47-3.84-.47v7.86h5.48a3.74 3.74 0 0 0 3.74-3.74V1.75H8.6Z"
    }
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "path",
    {
      fill: "url(#f)",
      d: "M18.94 1.75a3.74 3.74 0 0 0-3.74 3.73v4.9c.94-.8 2.59-1.32 5.24-1.2 1.41.06 2.93.45 2.93.45v1.58a7.1 7.1 0 0 0-2.83-.82c-2.01-.14-3.23.84-3.23 2.57 0 1.74 1.22 2.73 3.23 2.57a7.46 7.46 0 0 0 2.83-.82v1.58s-1.5.39-2.93.45c-2.65.12-4.3-.4-5.24-1.2v8.63h5.48a3.74 3.74 0 0 0 3.74-3.74V1.75h-5.48Z"
    }
  )),
  /* @__PURE__ */ (0, import_preact10.h)("defs", null, /* @__PURE__ */ (0, import_preact10.h)(
    "linearGradient",
    {
      id: "b",
      x1: "25.52",
      x2: "34.75",
      y1: "14.38",
      y2: "14.38",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "0", "stop-color": "#007940" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".23", "stop-color": "#00873F" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".74", "stop-color": "#40A737" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "1", "stop-color": "#5CB531" })
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "linearGradient",
    {
      id: "c",
      x1: "25.52",
      x2: "34.75",
      y1: "12.94",
      y2: "12.94",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "0", "stop-color": "#007940" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".23", "stop-color": "#00873F" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".74", "stop-color": "#40A737" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "1", "stop-color": "#5CB531" })
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "linearGradient",
    {
      id: "d",
      x1: "25.52",
      x2: "34.75",
      y1: "11.37",
      y2: "11.37",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "0", "stop-color": "#007940" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".23", "stop-color": "#00873F" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".74", "stop-color": "#40A737" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "1", "stop-color": "#5CB531" })
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "linearGradient",
    {
      id: "e",
      x1: "4.86",
      x2: "14.24",
      y1: "12.94",
      y2: "12.94",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "0", "stop-color": "#1F286F" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".48", "stop-color": "#004E94" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".83", "stop-color": "#0066B1" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "1", "stop-color": "#006FBC" })
  ), /* @__PURE__ */ (0, import_preact10.h)(
    "linearGradient",
    {
      id: "f",
      x1: "15.15",
      x2: "24.25",
      y1: "12.94",
      y2: "12.94",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "0", "stop-color": "#6C2C2F" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".17", "stop-color": "#882730" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".57", "stop-color": "#BE1833" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: ".86", "stop-color": "#DC0436" }),
    /* @__PURE__ */ (0, import_preact10.h)("stop", { offset: "1", "stop-color": "#E60039" })
  ), /* @__PURE__ */ (0, import_preact10.h)("clipPath", { id: "a" }, /* @__PURE__ */ (0, import_preact10.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" })))
);
var jcb_default = JcbIcon;

// src/assets/icons/diners.tsx
var import_preact11 = require("preact");
var DinersIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact11.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 40 26",
    width: "40",
    height: "26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact11.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" }),
  /* @__PURE__ */ (0, import_preact11.h)("g", { fill: "#1a1918" }, /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M5.96 15.58c0-.56-.3-.52-.58-.53v-.16H7.2a2.28 2.28 0 0 1 2.5 2.2c0 .61-.36 2.17-2.57 2.17H5.38v-.16c.38-.04.56-.05.58-.48zm.61 2.94c0 .49.35.54.65.54a1.75 1.75 0 0 0 1.8-1.95 1.88 1.88 0 0 0-1.96-2.02c-.26 0-.37.02-.49.02zm3.36.58h.12c.17 0 .3 0 .3-.2v-1.7c0-.28-.1-.32-.33-.44v-.1l.67-.23a.22.22 0 0 1 .11-.03c.03 0 .05.04.05.09v2.4c0 .21.13.21.3.21h.11v.16H9.93zm.67-3.67a.3.3 0 0 1 0-.61.3.3 0 0 1 .3.3.31.31 0 0 1-.3.31zm1.26 1.8c0-.23-.07-.3-.36-.41v-.12a8.44 8.44 0 0 0 .82-.3c.02 0 .04.01.04.06v.4a1.83 1.83 0 0 1 1.08-.46c.53 0 .72.39.72.88v1.61c0 .21.14.21.31.21h.12v.16h-1.34v-.16h.11c.18 0 .3 0 .3-.2v-1.63c0-.36-.22-.53-.57-.53a1.66 1.66 0 0 0-.73.3v1.85c0 .21.14.21.31.21h.12v.16h-1.34v-.16h.1c.18 0 .3 0 .3-.2v-1.67m3.21.3a1.55 1.55 0 0 0 0 .37 1.05 1.05 0 0 0 .92 1.08 1.2 1.2 0 0 0 .85-.42l.08.09a1.47 1.47 0 0 1-1.15.7 1.26 1.26 0 0 1-1.2-1.36c0-1.23.83-1.6 1.27-1.6a1 1 0 0 1 1.05 1 .74.74 0 0 1 0 .1l-.06.04zm1.11-.2c.16 0 .18-.08.18-.16a.53.53 0 0 0-.55-.57c-.38 0-.64.28-.72.73zm.86 1.77h.17c.17 0 .3 0 .3-.2v-1.77c0-.2-.23-.23-.33-.28v-.1c.46-.19.7-.35.77-.35.03 0 .05.02.05.08v.56H18c.16-.24.42-.64.8-.64a.34.34 0 0 1 .36.33.3.3 0 0 1-.3.32c-.19 0-.19-.15-.4-.15a.53.53 0 0 0-.46.52v1.47c0 .21.12.21.3.21h.35v.16h-.88a26 26 0 0 0-.74 0zm2.41-.7a.83.83 0 0 0 .78.76.44.44 0 0 0 .51-.45c0-.74-1.36-.5-1.36-1.5a.86.86 0 0 1 .97-.81 1.64 1.64 0 0 1 .71.18l.04.64h-.14a.64.64 0 0 0-.68-.62.44.44 0 0 0-.49.41c0 .74 1.45.51 1.45 1.5 0 .4-.33.85-1.07.85a1.64 1.64 0 0 1-.77-.22l-.07-.72.12-.03m7.44-2.37h-.15A1.2 1.2 0 0 0 25.39 15a1.79 1.79 0 0 0-1.77 2 2.04 2.04 0 0 0 1.87 2.17 1.27 1.27 0 0 0 1.25-1.09l.15.04-.15.91a3.5 3.5 0 0 1-1.38.34A2.23 2.23 0 0 1 22.97 17a2.3 2.3 0 0 1 2.37-2.2 4.5 4.5 0 0 1 1.48.33l.06.9m.22 3.07h.13c.17 0 .3 0 .3-.2v-3.5c0-.4-.1-.42-.34-.49v-.1a3.96 3.96 0 0 0 .65-.27.66.66 0 0 1 .14-.07c.03 0 .05.04.05.1v4.32c0 .21.13.21.3.21h.12v.16H27.1zm4.02-.18c0 .11.07.12.18.12h.25v.12a6.33 6.33 0 0 0-.9.2l-.03-.02v-.5a1.69 1.69 0 0 1-1.11.52.68.68 0 0 1-.69-.75v-1.6c0-.17-.02-.32-.37-.35v-.12l.8-.05c.07 0 .07.05.07.18v1.62c0 .19 0 .73.55.73a1.4 1.4 0 0 0 .75-.38v-1.7c0-.12-.3-.18-.52-.25v-.11c.56-.04.91-.09.97-.09.05 0 .05.05.05.11zm1.25-2.07a1.58 1.58 0 0 1 .93-.45 1.22 1.22 0 0 1 1.16 1.31 1.58 1.58 0 0 1-1.5 1.65 1.84 1.84 0 0 1-.86-.22l-.19.14-.13-.07a7.37 7.37 0 0 0 .09-1.11v-2.7c0-.4-.1-.42-.33-.49v-.1a3.93 3.93 0 0 0 .64-.27.67.67 0 0 1 .14-.07c.04 0 .05.04.05.1zm0 1.7a.67.67 0 0 0 .64.64c.67 0 .95-.65.95-1.21a1.2 1.2 0 0 0-1-1.24.96.96 0 0 0-.6.3v1.51zM5.38 22.91h.04c.13 0 .26-.02.26-.2v-1.78c0-.18-.13-.2-.26-.2h-.04v-.1l.5.01.54-.01v.1h-.05c-.12 0-.25.02-.25.2v1.79c0 .17.13.19.25.19h.05v.1L5.88 23l-.5.01z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M6.42 23.03 5.88 23l-.5.02h-.02v-.14h.06c.13 0 .24 0 .24-.17v-1.8c0-.16-.11-.17-.24-.17h-.06v-.13h1.07v.13h-.06c-.13 0-.24.01-.24.18v1.79c0 .16.11.17.24.17h.06v.14zM6.4 23v-.08h-.03c-.12 0-.27-.02-.27-.2v-1.8c0-.18.15-.2.27-.2h.03v-.07h-1v.07h.03c.13 0 .27.02.27.2v1.8c0 .18-.14.2-.27.2H5.4V23l.49-.02.52.02zm2.35-.66h.01v-1.29a.28.28 0 0 0-.3-.32H8.4v-.1l.48.01.42-.01v.1h-.06c-.14 0-.3.03-.3.44v1.55a2.27 2.27 0 0 0 .02.34h-.13L7.07 21.1v1.41c0 .3.06.4.32.4h.06v.1L7 23l-.47.01v-.1h.05c.24 0 .3-.16.3-.43v-1.44a.3.3 0 0 0-.3-.3h-.05v-.11l.4.01.3-.01 1.51 1.71" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M8.95 23.08h-.14l-1.73-1.94v1.37c0 .3.05.38.3.38h.08v.14h-.01L7 23l-.47.02h-.01v-.14h.06c.23 0 .3-.14.3-.41v-1.44a.3.3 0 0 0-.3-.3h-.06v-.12h.72l1.5 1.69v-1.26c0-.27-.19-.3-.29-.3h-.09v-.13h.94v.13h-.07c-.14 0-.28.01-.28.42v1.55a2.27 2.27 0 0 0 .02.34v.02zm-.13-.03h.11a2.3 2.3 0 0 1-.01-.33v-1.55c0-.41.17-.45.31-.45h.04v-.07H8.4v.07h.06a.3.3 0 0 1 .32.33v1.3h-.02v.01l-1.52-1.71h-.68v.07h.03a.32.32 0 0 1 .32.32v1.44c0 .27-.07.44-.32.45h-.03V23l.45-.02.42.02v-.07H7.4c-.27 0-.34-.12-.34-.42v-1.44l1.77 1.98zm-.07-.71.01-.01v.01zm0 0v-.01zM9.8 20.8c-.26 0-.27.06-.32.31h-.1l.04-.29a2.04 2.04 0 0 0 .02-.29h.08c.03.1.11.1.2.1h1.76c.1 0 .18 0 .18-.1h.09l-.04.28v.28l-.11.04c0-.13-.02-.33-.25-.33h-.56v1.82c0 .26.12.29.28.29h.07v.1l-.56-.01-.57.01v-.1h.06c.19 0 .28-.02.28-.29V20.8z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "m11.14 23.03-.56-.02-.57.02h-.02v-.14h.08c.19 0 .26 0 .27-.27v-1.8H9.8v-.03h.57v1.83c0 .28-.11.3-.3.3h-.05V23l.56-.02.54.02v-.07h-.05c-.16 0-.3-.05-.3-.31v-1.83h.58c.23 0 .26.2.26.32l.08-.03a3.96 3.96 0 0 1 .04-.53h-.05c-.02.1-.11.1-.2.1H9.71c-.08 0-.17 0-.2-.1h-.06a2.04 2.04 0 0 1-.02.27c0 .1-.02.19-.04.28h.08c.04-.24.07-.32.33-.31v.03c-.26 0-.25.04-.3.3h-.14v-.01l.04-.3a1.93 1.93 0 0 0 .02-.28v-.01h.11c.03.1.09.1.18.1h1.77c.1 0 .16 0 .17-.1v-.01h.02l.1.02-.01.01-.04.28v.28h-.01l-.12.05v-.02c-.01-.13-.03-.31-.24-.31h-.55v1.8c0 .25.11.27.27.27h.08v.14zm.71-.12h.05c.12 0 .25-.02.25-.2v-1.78c0-.18-.13-.2-.25-.2h-.05v-.1l.85.01.87-.01.01.52-.1.03c-.02-.22-.06-.4-.42-.4h-.47v.9h.4c.2 0 .25-.12.27-.3h.1v.78l-.1.02c-.02-.2-.03-.33-.26-.33h-.4v.79c0 .22.19.22.4.22.41 0 .6-.03.7-.41l.1.02a7.7 7.7 0 0 0-.12.54l-.92-.01-.9.01v-.1" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "m13.68 23.03-.92-.02-.9.02h-.02v-.14h.06c.13 0 .24 0 .24-.17v-1.8c0-.16-.11-.17-.24-.17h-.06v-.13h1.75v.01a4.18 4.18 0 0 0 0 .52v.01l-.13.04v-.02c-.02-.22-.05-.38-.4-.38h-.46v.86h.4c.2 0 .23-.1.25-.29v-.01h.13v.01a8.08 8.08 0 0 0 0 .8h-.01l-.12.03v-.02c-.02-.2-.03-.32-.25-.32h-.4v.78c0 .2.18.2.4.2.42 0 .58-.02.68-.4v-.01h.02l.1.03v.01a7.8 7.8 0 0 0-.11.54v.02zm-.02-.03.11-.52-.06-.02c-.1.39-.3.42-.7.42-.22 0-.43 0-.44-.24v-.8H13c.24-.01.26.13.28.33l.07-.02a7.25 7.25 0 0 1 0-.76h-.07c-.02.18-.08.3-.29.3h-.42v-.92h.5c.35 0 .4.18.42.4l.07-.03a5.76 5.76 0 0 1 0-.5l-.86.02-.83-.01v.07h.03c.12 0 .27.02.27.2v1.8c0 .18-.15.2-.27.2h-.03V23l.89-.02zm.59-2c0-.26-.14-.27-.24-.27h-.06v-.1l.53.01.54-.01c.43 0 .81.12.81.6a.64.64 0 0 1-.47.6l.58.87a.38.38 0 0 0 .33.21v.1l-.33-.01-.32.01a9.45 9.45 0 0 1-.7-1.1h-.23v.73c0 .26.12.27.28.27h.06v.1l-.59-.01-.5.01v-.1h.07c.13 0 .24-.06.24-.18v-1.74zm.44.78h.16c.34 0 .53-.13.53-.53a.47.47 0 0 0-.5-.5 1.65 1.65 0 0 0-.2.02v1.01z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "m16.27 23.03-.33-.02c-.1 0-.21.02-.33.01a9.54 9.54 0 0 1-.7-1.1h-.2v.72c0 .25.1.25.26.25h.07v.14h-.01l-.59-.02-.5.02v-.14H14c.12 0 .22-.05.23-.16v-1.74c0-.24-.13-.24-.23-.24h-.08v-.13h1.09c.43 0 .83.11.83.61a.65.65 0 0 1-.47.6l.57.87a.37.37 0 0 0 .32.2h.02v.13zm-1.58-1.14h.23a10.55 10.55 0 0 0 .7 1.1h.64v-.07a.39.39 0 0 1-.33-.2l-.6-.9h.02a.63.63 0 0 0 .47-.59c0-.47-.37-.58-.8-.58h-1.06v.07h.05c.1 0 .26.02.26.27v1.74c0 .13-.13.2-.26.2h-.05V23l.48-.02.57.02v-.07h-.04c-.16 0-.3-.02-.3-.3v-.74zm0-.1h-.02v-1.04h.01a1.63 1.63 0 0 1 .2-.01.48.48 0 0 1 .51.51c0 .4-.2.55-.54.55zm.16-.02c.34 0 .51-.12.51-.52a.45.45 0 0 0-.48-.48 1.33 1.33 0 0 0-.18.01v.99zm3.73.57h.01v-1.29a.28.28 0 0 0-.3-.32h-.07v-.1l.48.01.42-.01v.1h-.06c-.14 0-.3.03-.3.44v1.55a2.27 2.27 0 0 0 .02.34h-.13L16.9 21.1v1.41c0 .3.06.4.32.4h.06v.1l-.44-.01-.47.01v-.1h.05c.24 0 .3-.16.3-.43v-1.44a.3.3 0 0 0-.3-.3h-.05v-.11l.4.01.3-.01z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M18.78 23.08h-.14l-1.73-1.94v1.37c0 .3.05.38.3.38h.08v.14h-.01l-.44-.02-.47.02h-.01v-.14h.06c.23 0 .3-.14.3-.41v-1.44a.3.3 0 0 0-.3-.3h-.06v-.12h.71l1.5 1.69v-1.26c0-.27-.18-.3-.28-.3h-.09v-.13h.93v.13h-.07c-.14 0-.28.01-.28.42v1.55a2.15 2.15 0 0 0 .02.34v.02zm-.13-.03h.11a2.34 2.34 0 0 1-.01-.33v-1.55c0-.41.17-.45.31-.45h.04v-.07h-.87v.07h.06a.3.3 0 0 1 .32.33v1.3h-.02v.01l-1.52-1.71h-.68v.07h.03a.32.32 0 0 1 .32.32v1.44c0 .27-.07.44-.32.45h-.03V23l.45-.02.42.02v-.07h-.04c-.27 0-.34-.12-.34-.42v-1.44zm-.07-.71.01-.01v.01zm0 0v-.01zm1.08.18a1.38 1.38 0 0 0-.07.27c0 .1.14.12.25.12h.04v.1a7.72 7.72 0 0 0-.78 0v-.1h.02a.3.3 0 0 0 .3-.22l.54-1.57a2.87 2.87 0 0 0 .13-.42 1.73 1.73 0 0 0 .3-.15.08.08 0 0 1 .04 0 .02.02 0 0 1 .02 0l.03.1.63 1.78.12.34a.22.22 0 0 0 .23.14h.02v.1a9.66 9.66 0 0 0-.98 0v-.1h.03c.08 0 .22-.01.22-.1a1.1 1.1 0 0 0-.07-.25l-.14-.4h-.77l-.1.36zm.5-1.5-.32.96h.63l-.31-.97z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M21.48 23.03 21 23l-.51.02h-.02v-.14h.05c.08 0 .2-.01.2-.08a1.1 1.1 0 0 0-.07-.24l-.13-.39h-.75l-.1.35a1.41 1.41 0 0 0-.08.26c0 .08.13.1.24.1h.06v.14h-.02l-.41-.02-.37.02h-.01v-.14h.03a.3.3 0 0 0 .28-.2l.55-1.57a4.05 4.05 0 0 0 .13-.44 1.75 1.75 0 0 0 .31-.14.09.09 0 0 1 .03-.01.04.04 0 0 1 .04.02l.03.09.63 1.78c.04.12.08.25.13.35a.2.2 0 0 0 .2.12h.04v.14h-.01zM20.5 23l.5-.02.45.02v-.07a.23.23 0 0 1-.24-.15c-.05-.1-.09-.23-.13-.35l-.62-1.78-.03-.09h-.02a.08.08 0 0 0-.01 0 1.26 1.26 0 0 1-.3.14 2.83 2.83 0 0 1-.13.43l-.55 1.56a.32.32 0 0 1-.3.24h-.01V23l.35-.02.4.02v-.07h-.03c-.1 0-.26-.02-.27-.14a1.35 1.35 0 0 1 .08-.27h.01-.01l.11-.36h.8l.13.4a1.04 1.04 0 0 1 .07.25c0 .1-.15.11-.23.12h-.02zm-.7-1 .33-1h.03l.32 1zm.05-.04h.6l-.3-.91zm.28-.94h.01zm1.5-.22c-.26 0-.27.06-.32.31h-.1l.04-.29a2.1 2.1 0 0 0 .02-.29h.08c.03.1.11.1.2.1h1.76c.1 0 .18 0 .19-.1h.08l-.04.28v.28l-.1.04c-.02-.13-.03-.33-.26-.33h-.56v1.82c0 .26.12.29.28.29h.07v.1L22.4 23l-.57.01v-.1h.06c.19 0 .29-.02.29-.29V20.8h-.56" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M22.97 23.03 22.4 23l-.57.02h-.02v-.14h.08c.19 0 .27 0 .27-.27v-1.8h-.54v-.03h.57v1.83c0 .28-.11.3-.3.3h-.05V23l.56-.02.54.02v-.07h-.05c-.16 0-.3-.05-.3-.31v-1.83h.58c.23 0 .26.2.26.32l.08-.03v-.27l.04-.26h-.05c-.02.1-.11.1-.2.1h-1.77c-.08 0-.17 0-.2-.1h-.06a2 2 0 0 1-.02.27c0 .1-.02.19-.04.28h.08c.04-.24.07-.32.33-.31v.03c-.26 0-.25.04-.3.3h-.14v-.01l.04-.29a1.98 1.98 0 0 0 .02-.29v-.01h.11c.03.1.1.1.18.1h1.77c.1 0 .17 0 .17-.1v-.01h.02l.1.02v.01l-.05.28v.28h-.01l-.12.05v-.02c-.01-.13-.03-.31-.24-.31h-.54v1.8c0 .25.1.27.26.27h.08v.14h-.01m.74-.12h.05c.12 0 .25-.02.25-.2v-1.78c0-.18-.13-.2-.25-.2h-.05v-.1l.5.01.54-.01v.1h-.05c-.12 0-.25.02-.25.2v1.79c0 .17.13.19.25.19h.05v.1L24.2 23l-.5.01z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M24.74 23.03 24.2 23l-.5.02h-.01v-.14h.06c.12 0 .24 0 .24-.17v-1.8c0-.16-.12-.17-.24-.17h-.06v-.13h1.07v.13h-.07c-.12 0-.23.01-.23.18v1.79c0 .16.1.17.23.17h.07v.14zm-.01-.03v-.07h-.04c-.12 0-.26-.03-.26-.21v-1.8c0-.18.14-.2.26-.2h.04v-.07H23.7v.07h.04c.12 0 .27.02.27.2v1.8c0 .18-.15.2-.27.2h-.03V23l.48-.02.53.02zm1.37-2.42a1.2 1.2 0 0 1 1.3 1.18 1.25 1.25 0 0 1-1.28 1.3 1.2 1.2 0 0 1-1.28-1.22 1.24 1.24 0 0 1 1.26-1.26m.05 2.33c.66 0 .78-.58.78-1.08s-.27-1.1-.84-1.1c-.6 0-.77.53-.77.99 0 .6.28 1.2.83 1.2" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M24.83 21.84a1.26 1.26 0 0 1 1.27-1.28v.03a1.23 1.23 0 0 0-1.24 1.25 1.19 1.19 0 0 0 1.26 1.2 1.24 1.24 0 0 0 1.27-1.28 1.18 1.18 0 0 0-1.3-1.17v-.03a1.21 1.21 0 0 1 1.33 1.2 1.27 1.27 0 0 1-1.3 1.32 1.22 1.22 0 0 1-1.3-1.24m.48-.12c0-.46.18-1 .8-1 .57 0 .84.61.84 1.11s-.12 1.1-.79 1.1v-.03c.65 0 .76-.57.76-1.07s-.26-1.08-.82-1.09c-.58 0-.75.52-.76.98 0 .6.28 1.18.82 1.18v.03c-.56 0-.84-.6-.85-1.21m4.4.62v-1.29a.28.28 0 0 0-.3-.32h-.07v-.1l.48.01.42-.01v.1h-.05c-.15 0-.3.03-.3.44v1.55a2.2 2.2 0 0 0 .01.34h-.12L28 21.1v1.41c0 .3.06.4.32.4h.06v.1l-.44-.01-.46.01v-.1h.05c.23 0 .3-.16.3-.43v-1.44a.3.3 0 0 0-.3-.3h-.05v-.11l.39.01.3-.01 1.52 1.71" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "M29.9 23.08h-.15l-1.72-1.94v1.37c0 .3.05.38.3.38h.07v.14h-.01l-.44-.02-.46.02h-.02v-.14h.07c.22 0 .28-.14.29-.41v-1.44a.3.3 0 0 0-.3-.3h-.06v-.12h.72l1.5 1.69v-1.26c0-.27-.18-.3-.28-.3h-.1v-.13h.94v.13h-.06c-.14 0-.29.01-.3.42v1.55a2.26 2.26 0 0 0 .03.34v.02zm-.13-.03h.1a2.42 2.42 0 0 1-.01-.33v-1.55c0-.41.17-.45.32-.45h.03v-.07h-.86v.07h.06a.3.3 0 0 1 .3.33v1.3l-.01.01-1.52-1.71h-.68v.07h.03a.32.32 0 0 1 .33.32v1.44c0 .27-.08.44-.32.45h-.04V23l.45-.02.43.02v-.07h-.05c-.27 0-.33-.12-.33-.42v-1.44zm-.07-.71v-.01zm-.01 0v-.01zm1.09.18a1.43 1.43 0 0 0-.08.27c0 .1.14.12.26.12h.03v.1a7.71 7.71 0 0 0-.78 0v-.1h.02a.3.3 0 0 0 .3-.22l.55-1.57a2.79 2.79 0 0 0 .12-.42 1.75 1.75 0 0 0 .31-.15.07.07 0 0 1 .03 0 .02.02 0 0 1 .02 0l.03.1.63 1.78c.04.11.08.24.13.34a.22.22 0 0 0 .22.14h.02v.1a9.66 9.66 0 0 0-.98 0v-.1h.04c.08 0 .2-.01.2-.1a1.1 1.1 0 0 0-.06-.25l-.13-.4h-.78zm.5-1.5h-.01l-.32.96h.64l-.32-.97z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "m32.59 23.03-.47-.02-.5.02h-.02v-.14h.05c.08 0 .2-.01.2-.08a1.06 1.06 0 0 0-.07-.24l-.13-.39h-.76l-.1.35a1.44 1.44 0 0 0-.07.26c0 .08.12.1.24.1H31v.14h-.02l-.4-.02-.38.02h-.01v-.14h.03a.3.3 0 0 0 .29-.2l.54-1.57a4.27 4.27 0 0 0 .14-.44 1.85 1.85 0 0 0 .3-.14.08.08 0 0 1 .04 0 .04.04 0 0 1 .04.01l.03.09.62 1.78c.04.12.08.25.13.35a.2.2 0 0 0 .2.12h.04v.14h-.01zm-.97-.03.5-.02.46.02v-.08h-.01a.23.23 0 0 1-.24-.14l-.12-.35-.63-1.78a3.61 3.61 0 0 1-.03-.09h-.01a.06.06 0 0 0-.02 0 1.3 1.3 0 0 1-.3.14 2.94 2.94 0 0 1-.13.43l-.55 1.56a.32.32 0 0 1-.3.24h-.01V23l.35-.02.4.02v-.07h-.02c-.11 0-.27-.02-.27-.14a1.42 1.42 0 0 1 .07-.27h.02-.02l.11-.36h.8l.13.4a1.07 1.07 0 0 1 .07.25c0 .1-.15.11-.22.12h-.03zm-.7-1 .34-1h.02l.33 1zm.05-.04h.6l-.3-.91zm2.48.72c0 .13.1.18.2.19a2.47 2.47 0 0 0 .45 0 .48.48 0 0 0 .33-.2.78.78 0 0 0 .1-.24h.1l-.12.58-.9-.01-.9.01v-.1h.05c.12 0 .25-.02.25-.23v-1.75c0-.18-.13-.2-.25-.2h-.05v-.1l.54.01.51-.01v.1h-.08c-.13 0-.23 0-.23.19z" }), /* @__PURE__ */ (0, import_preact11.h)("path", { d: "m34.5 23.03-.9-.02-.9.02v-.14h.06c.12 0 .24 0 .24-.2v-1.76c0-.17-.12-.18-.24-.18h-.07v-.13h1.09v.13h-.1c-.13 0-.21 0-.22.17v1.76c0 .13.09.16.2.17l.18.01a2.46 2.46 0 0 0 .26-.01.48.48 0 0 0 .32-.18.77.77 0 0 0 .1-.24v-.01h.13v.02l-.13.58zm0-.03.11-.55h-.07a.77.77 0 0 1-.1.24.5.5 0 0 1-.34.19 2.6 2.6 0 0 1-.26.01h-.19c-.11-.02-.22-.07-.22-.21v-1.76c0-.2.12-.2.25-.2h.07v-.07h-1.03v.07h.04c.12 0 .27.02.27.2v1.76c0 .22-.15.24-.27.24h-.04V23l.89-.02.88.02zm.1-2.47a.36.36 0 1 1-.37.36.35.35 0 0 1 .36-.36zm0 .66a.3.3 0 1 0-.3-.3.29.29 0 0 0 .3.3zm-.19-.1v-.02c.05-.01.05 0 .05-.04v-.26c0-.04 0-.05-.05-.05v-.02h.19c.06 0 .12.03.12.1a.11.11 0 0 1-.09.1l.06.09a.38.38 0 0 0 .08.08v.01h-.07c-.03 0-.06-.07-.13-.16h-.04v.12c0 .02.01.02.06.03v.01zm.12-.2h.05c.04 0 .06-.03.06-.09s-.03-.08-.07-.08h-.04z" })),
  /* @__PURE__ */ (0, import_preact11.h)(
    "path",
    {
      fill: "#fff",
      d: "M13.33 8.58a5.77 5.77 0 1 1 5.76 5.78 5.77 5.77 0 0 1-5.76-5.78"
    }
  ),
  /* @__PURE__ */ (0, import_preact11.h)(
    "path",
    {
      fill: "#154a78",
      d: "M22.58 8.47a3.48 3.48 0 0 0-2.23-3.24v6.48a3.48 3.48 0 0 0 2.23-3.24zm-4.7 3.24V5.23a3.47 3.47 0 0 0 0 6.48zM19.1 3a5.48 5.48 0 1 0 5.47 5.48A5.47 5.47 0 0 0 19.11 3zm0 11.48a5.99 5.99 0 0 1-6.03-5.94A5.9 5.9 0 0 1 19.1 2.5h1.55a6.1 6.1 0 0 1 6.24 6.03 6.22 6.22 0 0 1-6.24 5.94z"
    }
  )
);
var diners_default = DinersIcon;

// src/assets/icons/discover.tsx
var import_preact12 = require("preact");
var DiscoverIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact12.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    fill: "none",
    viewBox: "0 0 40 26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact12.h)("path", { fill: "#fff", d: "M0 0h40v26H0z" }),
  /* @__PURE__ */ (0, import_preact12.h)("g", { "clip-path": "url(#a)" }, /* @__PURE__ */ (0, import_preact12.h)("g", { "clip-path": "url(#b)" }, /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "#000",
      d: "M3.5 19.56a1.6 1.6 0 0 1 1.54-1.6h.06a1.52 1.52 0 0 1 1.42.77l-.43.25a1.02 1.02 0 0 0-.99-.59 1.13 1.13 0 0 0-1.14 1.11v.03a1.05 1.05 0 0 0 .99 1.14h.1a.94.94 0 0 0 1.04-.83H5.01v-.43h1.51v1.66h-.46v-.49l.03-.12a1.08 1.08 0 0 1-1.08.64 1.49 1.49 0 0 1-1.51-1.48v-.06Zm3.58-1.79h.46v3.33h-.46v-3.33Zm.92 2.2a1.2 1.2 0 1 1 .74 1.11A1.19 1.19 0 0 1 8 19.96Zm1.91 0a.74.74 0 1 0-1.48.06.72.72 0 0 0 .74.7.74.74 0 0 0 .74-.77Zm1.36.8v.33h-.46v-3.36h.46v1.4a.98.98 0 0 1 .77-.38 1.19 1.19 0 0 1 0 2.38.9.9 0 0 1-.77-.37Zm1.48-.8a.75.75 0 1 0-1.5-.04v.03a.76.76 0 1 0 1.5 0Zm.8.55c0-.46.28-.65.9-.74.43-.06.58-.1.58-.25s-.12-.37-.46-.37a.54.54 0 0 0-.58.43l-.44-.18a1.01 1.01 0 0 1 1.02-.65c.59 0 .96.3.96.86v1.48h-.43v-.33a.75.75 0 0 1-.74.4c-.5 0-.8-.28-.8-.65Zm1.33.06a.5.5 0 0 0 .19-.4v-.19c0 .1-.16.13-.5.16-.4.06-.55.15-.55.34 0 .15.15.28.37.28.18 0 .35-.07.49-.19Zm1.14-2.8h.46v3.32h-.46v-3.33Zm2.04.24h.5l1.53 2.34v-2.34h.47v3.12h-.47l-1.57-2.41v2.4h-.46v-3.11Zm2.96 1.94a1.18 1.18 0 0 1 1.17-1.2h.03a1.14 1.14 0 0 1 1.17 1.11v.25h-1.94a.77.77 0 0 0 .96.58c.2-.05.37-.17.49-.34l.37.22a1.18 1.18 0 0 1-1.05.56 1.15 1.15 0 0 1-1.2-1.11v-.07Zm.46-.21h1.45a.67.67 0 0 0-.7-.56.7.7 0 0 0-.75.56Zm2.56.61v-1.14h-.46v-.4h.46v-.5l.46-.3v.8h.62v.4h-.65v1.14c0 .25.13.37.31.37.12 0 .24-.03.34-.09v.43a.82.82 0 0 1-.37.1c-.46 0-.71-.25-.71-.8Zm1.36-1.54h.46l.52 1.67.62-1.67h.43l.62 1.67.55-1.67h.47l-.8 2.28h-.44l-.61-1.66-.65 1.7h-.46l-.71-2.32Zm3.88 1.14a1.2 1.2 0 1 1 .74 1.12 1.19 1.19 0 0 1-.74-1.12Zm1.92 0a.74.74 0 1 0-1.48.07.72.72 0 0 0 .74.7.74.74 0 0 0 .74-.77Zm.89-1.14h.46v.4a.72.72 0 0 1 .65-.4h.19v.46h-.28c-.37 0-.56.16-.56.6v1.22h-.46v-2.28Zm2.59 1.24-.4.43v.58h-.46v-3.3h.46V20l1.08-1.17h.55l-.89.96.92 1.32h-.52l-.74-1.04ZM5.2 10.16H3.72v5.18H5.2c.66.03 1.32-.18 1.85-.59a2.56 2.56 0 0 0 .92-1.97c0-1.54-1.14-2.62-2.77-2.62Zm1.2 3.88c-.3.28-.74.4-1.39.4h-.28v-3.39h.28a1.88 1.88 0 0 1 1.39.43 1.73 1.73 0 0 1 .55 1.3c0 .48-.2.93-.55 1.26Zm2.03-3.88h1.02v5.18H8.43v-5.18Zm3.49 2c-.62-.22-.77-.37-.77-.65 0-.34.3-.58.74-.58a.97.97 0 0 1 .8.43l.53-.68a2.32 2.32 0 0 0-1.52-.59 1.52 1.52 0 0 0-1.6 1.42v.06c0 .71.34 1.08 1.26 1.42.25.08.49.18.71.31a.64.64 0 0 1 .31.53.75.75 0 0 1-.74.74h-.03a1.29 1.29 0 0 1-1.1-.68l-.66.61a2 2 0 0 0 1.8 1 1.68 1.68 0 0 0 1.78-1.7c-.03-.87-.37-1.24-1.51-1.64Zm1.82.59a2.66 2.66 0 0 0 2.65 2.68h.06c.44 0 .88-.1 1.27-.3v-1.18a1.54 1.54 0 0 1-1.2.55 1.69 1.69 0 0 1-1.73-1.63v-.15a1.72 1.72 0 0 1 1.66-1.8h.03a1.64 1.64 0 0 1 1.27.6v-1.15c-.38-.2-.8-.31-1.23-.3a2.69 2.69 0 0 0-2.78 2.68Zm11.97.9-1.4-3.5h-1.07l2.19 5.31h.52l2.25-5.3h-1.1l-1.4 3.48Zm2.96 1.69h2.83v-.87h-1.85v-1.41h1.8v-.87h-1.8v-1.14h1.85v-.9h-2.83v5.19Zm6.84-3.64c0-.96-.68-1.51-1.82-1.51h-1.48v5.18h1.02v-2.1h.12l1.4 2.07h1.23l-1.64-2.2a1.36 1.36 0 0 0 1.17-1.44Zm-2.03.86h-.31V11h.3c.62 0 .96.28.96.77.03.52-.3.8-.95.8Zm2.84-2.13c0-.09-.07-.15-.19-.15h-.15v.46h.12v-.15l.12.18h.13l-.13-.21c.06 0 .1-.06.1-.13Zm-.19.07-.03-.13h.03c.06 0 .1.03.1.06-.04.07-.07.07-.1.07Z"
    }
  )), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "#000",
      d: "M36.16 10.13a.4.4 0 0 0-.4.4.4.4 0 1 0 .8 0 .4.4 0 0 0-.4-.4Zm0 .74a.32.32 0 0 1-.34-.31.32.32 0 0 1 .65-.03.34.34 0 0 1-.3.34Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#c)",
      d: "M18.06 12.75a2.75 2.75 0 1 0 5.49 0 2.75 2.75 0 0 0-5.5 0Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#d)",
      d: "M18.06 12.75a2.75 2.75 0 1 0 5.49 0 2.75 2.75 0 0 0-5.5 0Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "mask",
    {
      id: "e",
      width: "6",
      height: "6",
      x: "18",
      y: "10",
      maskUnits: "userSpaceOnUse",
      style: "mask-type:luminance"
    },
    /* @__PURE__ */ (0, import_preact12.h)(
      "path",
      {
        fill: "#fff",
        d: "M18.06 12.75a2.74 2.74 0 1 0 5.49 0 2.74 2.74 0 0 0-5.5 0Z"
      }
    )
  ), /* @__PURE__ */ (0, import_preact12.h)("g", { mask: "url(#e)" }, /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#f)",
      d: "M17.75 12.87a3.36 3.36 0 1 0 6.72 0 3.36 3.36 0 0 0-6.72 0Z"
    }
  ))),
  /* @__PURE__ */ (0, import_preact12.h)("g", { "clip-path": "url(#g)" }, /* @__PURE__ */ (0, import_preact12.h)("g", { "clip-path": "url(#h)" }, /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "#000",
      d: "M3.5 19.56a1.6 1.6 0 0 1 1.54-1.6h.06a1.52 1.52 0 0 1 1.42.77l-.43.25a1.02 1.02 0 0 0-.99-.59 1.13 1.13 0 0 0-1.14 1.11v.03a1.05 1.05 0 0 0 .99 1.14h.1a.94.94 0 0 0 1.04-.83H5.01v-.43h1.51v1.66h-.46v-.49l.03-.12a1.08 1.08 0 0 1-1.08.64 1.49 1.49 0 0 1-1.51-1.48v-.06Zm3.58-1.79h.46v3.33h-.46v-3.33Zm.92 2.2a1.2 1.2 0 1 1 .74 1.11A1.19 1.19 0 0 1 8 19.96Zm1.91 0a.74.74 0 1 0-1.48.06.72.72 0 0 0 .74.7.74.74 0 0 0 .74-.77Zm1.36.8v.33h-.46v-3.36h.46v1.4a.98.98 0 0 1 .77-.38 1.19 1.19 0 0 1 0 2.38.9.9 0 0 1-.77-.37Zm1.48-.8a.75.75 0 1 0-1.5-.04v.03a.76.76 0 1 0 1.5 0Zm.8.55c0-.46.28-.65.9-.74.43-.06.58-.1.58-.25s-.12-.37-.46-.37a.54.54 0 0 0-.58.43l-.44-.18a1.01 1.01 0 0 1 1.02-.65c.59 0 .96.3.96.86v1.48h-.43v-.33a.75.75 0 0 1-.74.4c-.5 0-.8-.28-.8-.65Zm1.33.06a.5.5 0 0 0 .19-.4v-.19c0 .1-.16.13-.5.16-.4.06-.55.15-.55.34 0 .15.15.28.37.28.18 0 .35-.07.49-.19Zm1.14-2.8h.46v3.32h-.46v-3.33Zm2.04.24h.5l1.53 2.34v-2.34h.47v3.12h-.47l-1.57-2.41v2.4h-.46v-3.11Zm2.96 1.94a1.18 1.18 0 0 1 1.17-1.2h.03a1.14 1.14 0 0 1 1.17 1.11v.25h-1.94a.77.77 0 0 0 .96.58c.2-.05.37-.17.49-.34l.37.22a1.18 1.18 0 0 1-1.05.56 1.15 1.15 0 0 1-1.2-1.11v-.07Zm.46-.21h1.45a.67.67 0 0 0-.7-.56.7.7 0 0 0-.75.56Zm2.56.61v-1.14h-.46v-.4h.46v-.5l.46-.3v.8h.62v.4h-.65v1.14c0 .25.13.37.31.37.12 0 .24-.03.34-.09v.43a.82.82 0 0 1-.37.1c-.46 0-.71-.25-.71-.8Zm1.36-1.54h.46l.52 1.67.62-1.67h.43l.62 1.67.55-1.67h.47l-.8 2.28h-.44l-.61-1.66-.65 1.7h-.46l-.71-2.32Zm3.88 1.14a1.2 1.2 0 1 1 .74 1.12 1.19 1.19 0 0 1-.74-1.12Zm1.92 0a.74.74 0 1 0-1.48.07.72.72 0 0 0 .74.7.74.74 0 0 0 .74-.77Zm.89-1.14h.46v.4a.72.72 0 0 1 .65-.4h.19v.46h-.28c-.37 0-.56.16-.56.6v1.22h-.46v-2.28Zm2.59 1.24-.4.43v.58h-.46v-3.3h.46V20l1.08-1.17h.55l-.89.96.92 1.32h-.52l-.74-1.04ZM5.2 10.16H3.72v5.18H5.2c.66.03 1.32-.18 1.85-.59a2.56 2.56 0 0 0 .92-1.97c0-1.54-1.14-2.62-2.77-2.62Zm1.2 3.88c-.3.28-.74.4-1.39.4h-.28v-3.39h.28a1.88 1.88 0 0 1 1.39.43 1.73 1.73 0 0 1 .55 1.3c0 .48-.2.93-.55 1.26Zm2.03-3.88h1.02v5.18H8.43v-5.18Zm3.49 2c-.62-.22-.77-.37-.77-.65 0-.34.3-.58.74-.58a.97.97 0 0 1 .8.43l.53-.68a2.32 2.32 0 0 0-1.52-.59 1.52 1.52 0 0 0-1.6 1.42v.06c0 .71.34 1.08 1.26 1.42.25.08.49.18.71.31a.64.64 0 0 1 .31.53.75.75 0 0 1-.74.74h-.03a1.29 1.29 0 0 1-1.1-.68l-.66.61a2 2 0 0 0 1.8 1 1.68 1.68 0 0 0 1.78-1.7c-.03-.87-.37-1.24-1.51-1.64Zm1.82.59a2.66 2.66 0 0 0 2.65 2.68h.06c.44 0 .88-.1 1.27-.3v-1.18a1.54 1.54 0 0 1-1.2.55 1.69 1.69 0 0 1-1.73-1.63v-.15a1.72 1.72 0 0 1 1.66-1.8h.03a1.64 1.64 0 0 1 1.27.6v-1.15c-.38-.2-.8-.31-1.23-.3a2.69 2.69 0 0 0-2.78 2.68Zm11.97.9-1.4-3.5h-1.07l2.19 5.31h.52l2.25-5.3h-1.1l-1.4 3.48Zm2.96 1.69h2.83v-.87h-1.85v-1.41h1.8v-.87h-1.8v-1.14h1.85v-.9h-2.83v5.19Zm6.84-3.64c0-.96-.68-1.51-1.82-1.51h-1.48v5.18h1.02v-2.1h.12l1.4 2.07h1.23l-1.64-2.2a1.36 1.36 0 0 0 1.17-1.44Zm-2.03.86h-.31V11h.3c.62 0 .96.28.96.77.03.52-.3.8-.95.8Zm2.84-2.13c0-.09-.07-.15-.19-.15h-.15v.46h.12v-.15l.12.18h.13l-.13-.21c.06 0 .1-.06.1-.13Zm-.19.07-.03-.13h.03c.06 0 .1.03.1.06-.04.07-.07.07-.1.07Z"
    }
  )), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "#000",
      d: "M36.16 10.13a.4.4 0 0 0-.4.4.4.4 0 1 0 .8 0 .4.4 0 0 0-.4-.4Zm0 .74a.32.32 0 0 1-.34-.31.32.32 0 0 1 .65-.03.34.34 0 0 1-.3.34Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#i)",
      d: "M18.06 12.75a2.75 2.75 0 1 0 5.49 0 2.75 2.75 0 0 0-5.5 0Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#j)",
      d: "M18.06 12.75a2.75 2.75 0 1 0 5.49 0 2.75 2.75 0 0 0-5.5 0Z"
    }
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "mask",
    {
      id: "k",
      width: "6",
      height: "6",
      x: "18",
      y: "10",
      maskUnits: "userSpaceOnUse",
      style: "mask-type:luminance"
    },
    /* @__PURE__ */ (0, import_preact12.h)(
      "path",
      {
        fill: "#fff",
        d: "M18.06 12.75a2.74 2.74 0 1 0 5.49 0 2.74 2.74 0 0 0-5.5 0Z"
      }
    )
  ), /* @__PURE__ */ (0, import_preact12.h)("g", { mask: "url(#k)" }, /* @__PURE__ */ (0, import_preact12.h)(
    "path",
    {
      fill: "url(#l)",
      d: "M17.75 12.87a3.36 3.36 0 1 0 6.72 0 3.36 3.36 0 0 0-6.72 0Z"
    }
  ))),
  /* @__PURE__ */ (0, import_preact12.h)("defs", null, /* @__PURE__ */ (0, import_preact12.h)(
    "linearGradient",
    {
      id: "c",
      x1: "22.25",
      x2: "19.35",
      y1: "15.06",
      y2: "10.42",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F59F00" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".19", "stop-color": "#F49B00" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".37", "stop-color": "#F29101" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".5", "stop-color": "#F08302" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".6", "stop-color": "#EE7905" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".76", "stop-color": "#EC7008" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "1", "stop-color": "#EC6D09" })
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "linearGradient",
    {
      id: "d",
      x1: "22.25",
      x2: "19.35",
      y1: "15.06",
      y2: "10.42",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F3941E", "stop-opacity": "0" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".04", "stop-color": "#F48C1C", "stop-opacity": ".08" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".2", "stop-color": "#F77314", "stop-opacity": ".32" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".35", "stop-color": "#F95D0E", "stop-opacity": ".53" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".5", "stop-color": "#FB4B09", "stop-opacity": ".7" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".64", "stop-color": "#FD3D05", "stop-opacity": ".83" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".77", "stop-color": "#FE3302", "stop-opacity": ".92" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".9", "stop-color": "#FF2D01", "stop-opacity": ".98" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "1", "stop-color": "#FF2B00" })
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "radialGradient",
    {
      id: "f",
      cx: "0",
      cy: "0",
      r: "1",
      gradientTransform: "rotate(4.24 -167.26 291.02) scale(3.3208)",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F3941E", "stop-opacity": "0" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".45", "stop-color": "#EA8D1D", "stop-opacity": ".05" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".66", "stop-color": "#CA7618", "stop-opacity": ".2" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".83", "stop-color": "#924D10", "stop-opacity": ".48" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".96", "stop-color": "#441304", "stop-opacity": ".87" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".99", "stop-color": "#2F0401", "stop-opacity": ".97" })
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "linearGradient",
    {
      id: "i",
      x1: "22.25",
      x2: "19.35",
      y1: "15.06",
      y2: "10.42",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F59F00" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".19", "stop-color": "#F49B00" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".37", "stop-color": "#F29101" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".5", "stop-color": "#F08302" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".6", "stop-color": "#EE7905" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".76", "stop-color": "#EC7008" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "1", "stop-color": "#EC6D09" })
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "linearGradient",
    {
      id: "j",
      x1: "22.25",
      x2: "19.35",
      y1: "15.06",
      y2: "10.42",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F3941E", "stop-opacity": "0" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".04", "stop-color": "#F48C1C", "stop-opacity": ".08" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".2", "stop-color": "#F77314", "stop-opacity": ".32" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".35", "stop-color": "#F95D0E", "stop-opacity": ".53" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".5", "stop-color": "#FB4B09", "stop-opacity": ".7" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".64", "stop-color": "#FD3D05", "stop-opacity": ".83" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".77", "stop-color": "#FE3302", "stop-opacity": ".92" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".9", "stop-color": "#FF2D01", "stop-opacity": ".98" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "1", "stop-color": "#FF2B00" })
  ), /* @__PURE__ */ (0, import_preact12.h)(
    "radialGradient",
    {
      id: "l",
      cx: "0",
      cy: "0",
      r: "1",
      gradientTransform: "rotate(4.24 -167.26 291.02) scale(3.3208)",
      gradientUnits: "userSpaceOnUse"
    },
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: "0", "stop-color": "#F3941E", "stop-opacity": "0" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".45", "stop-color": "#EA8D1D", "stop-opacity": ".05" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".66", "stop-color": "#CA7618", "stop-opacity": ".2" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".83", "stop-color": "#924D10", "stop-opacity": ".48" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".96", "stop-color": "#441304", "stop-opacity": ".87" }),
    /* @__PURE__ */ (0, import_preact12.h)("stop", { offset: ".99", "stop-color": "#2F0401", "stop-opacity": ".97" })
  ), /* @__PURE__ */ (0, import_preact12.h)("clipPath", { id: "a" }, /* @__PURE__ */ (0, import_preact12.h)("path", { fill: "#fff", d: "M0 0h33v5.55H0z", transform: "translate(3.5 10)" })), /* @__PURE__ */ (0, import_preact12.h)("clipPath", { id: "b" }, /* @__PURE__ */ (0, import_preact12.h)("path", { fill: "#fff", d: "M0 0h33v5.86H0z", transform: "translate(3.5 10)" })), /* @__PURE__ */ (0, import_preact12.h)("clipPath", { id: "g" }, /* @__PURE__ */ (0, import_preact12.h)("path", { fill: "#fff", d: "M0 0h33v5.55H0z", transform: "translate(3.5 10)" })), /* @__PURE__ */ (0, import_preact12.h)("clipPath", { id: "h" }, /* @__PURE__ */ (0, import_preact12.h)("path", { fill: "#fff", d: "M0 0h33v5.86H0z", transform: "translate(3.5 10)" })))
);
var discover_default = DiscoverIcon;

// src/assets/icons/cup.tsx
var import_preact13 = require("preact");
var CupIcon = ({ opacity = 1 }) => /* @__PURE__ */ (0, import_preact13.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 40 26",
    width: "40",
    height: "26",
    opacity
  },
  /* @__PURE__ */ (0, import_preact13.h)("rect", { width: "45.3", height: "27", x: "-3.3", y: "-.79", fill: "#fff", rx: "2.82" }),
  /* @__PURE__ */ (0, import_preact13.h)(
    "path",
    {
      fill: "#01798a",
      d: "M27.27-.79a4.06 4.06 0 0 0-3.6 2.8l-4.96 23.42a2.14 2.14 0 0 0 2 2.8h18.35a2.81 2.81 0 0 0 2.8-2.82V1.15A2.25 2.25 0 0 0 40-.8"
    }
  ),
  /* @__PURE__ */ (0, import_preact13.h)(
    "rect",
    {
      width: "20.38",
      height: "29.02",
      x: "-4",
      y: "-.79",
      fill: "#dc1f2b",
      rx: "2.82"
    }
  ),
  /* @__PURE__ */ (0, import_preact13.h)(
    "path",
    {
      fill: "#1a4580",
      d: "M24.37 2.02a3.98 3.98 0 0 1 3.48-2.8H14.18a3.97 3.97 0 0 0-3.5 2.8l-4.85 23.4a2.13 2.13 0 0 0 1.94 2.81h13.7a2.13 2.13 0 0 1-1.94-2.8z"
    }
  ),
  /* @__PURE__ */ (0, import_preact13.h)(
    "path",
    {
      fill: "#fff",
      d: "M16.63 15.04h.18a.32.32 0 0 0 .32-.17l.46-.7h1.24l-.26.47h1.49l-.2.7H18.1a.82.82 0 0 1-.75.44h-.92zm-.2 1h3.25l-.21.77h-1.3l-.2.74h1.27l-.21.77h-1.27l-.3 1.09c-.07.18.02.26.29.24h1.03l-.19.71H16.6q-.57 0-.39-.65l.38-1.4h-.81l.2-.76h.82l.2-.74h-.78l.2-.76zm5.19-1.87-.06.45a2.37 2.37 0 0 1 1.18-.47h2.05l-.78 2.88q-.1.5-.84.5h-2.34l-.54 2.01c-.03.11.01.17.13.17h.46l-.17.62h-1.17q-.67 0-.56-.4l1.54-5.76zm1.74.81h-1.84l-.22.78a1.52 1.52 0 0 1 .82-.23h1.1zm-.67 1.8c.14.02.22-.03.22-.16l.12-.4h-1.84l-.16.57zm-1.24.93h1.06l-.02.47h.29c.14 0 .2-.05.2-.14l.1-.3h.87l-.11.44a.76.76 0 0 1-.8.57h-.56v.8c-.01.12.1.18.33.18h.53l-.17.63H21.9c-.36.02-.53-.15-.53-.52zM8.6 10.34a2.62 2.62 0 0 1-1 1.64 3.24 3.24 0 0 1-1.98.58 2.16 2.16 0 0 1-1.68-.59 1.54 1.54 0 0 1-.37-1.06 2.86 2.86 0 0 1 .06-.57l.87-4.2h1.3l-.85 4.15a1.35 1.35 0 0 0-.04.32.82.82 0 0 0 .16.52.89.89 0 0 0 .75.3 1.56 1.56 0 0 0 1-.3 1.37 1.37 0 0 0 .5-.84l.84-4.15h1.3zm5.47-1.65h1.02l-.8 3.74h-1.02zm.32-1.37h1.03l-.2.91H14.2l.19-.9M16 12.15a1.39 1.39 0 0 1-.41-1.05 2.45 2.45 0 0 1 .01-.25l.04-.27a2.55 2.55 0 0 1 .78-1.45 2.07 2.07 0 0 1 1.43-.54 1.5 1.5 0 0 1 1.1.39 1.4 1.4 0 0 1 .4 1.06 2.59 2.59 0 0 1-.02.26l-.05.28a2.48 2.48 0 0 1-.77 1.42 2.08 2.08 0 0 1-1.43.53 1.5 1.5 0 0 1-1.09-.38m1.95-.74a1.84 1.84 0 0 0 .38-.9.58.58 0 0 0 .03-.19 1.74 1.74 0 0 0 .01-.17.76.76 0 0 0-.17-.54.64.64 0 0 0-.5-.2.89.89 0 0 0-.7.3 1.9 1.9 0 0 0-.38.92l-.03.18a1.36 1.36 0 0 0-.01.17.75.75 0 0 0 .17.54.64.64 0 0 0 .5.18.9.9 0 0 0 .7-.3m8.02 3.67.25-.87h1.24l-.05.32a3.1 3.1 0 0 1 1.09-.32h1.54l-.25.87h-.24l-1.16 4.12h.24l-.23.82h-.24l-.1.36h-1.2l.1-.36h-2.38l.23-.82h.24l1.16-4.12zm1.34 0L27 16.2a5.13 5.13 0 0 1 1-.27c.1-.4.24-.85.24-.85zm-.46 1.64-.32 1.17a3.44 3.44 0 0 1 1.01-.33l.24-.84zm.23 2.48.24-.84h-.93l-.24.84zm3.01-5.05h1.17l.05.44c0 .11.06.16.2.16h.2l-.2.74h-.87c-.32.02-.5-.1-.5-.38zm-.34 1.59h3.79l-.23.79h-1.2l-.2.74h1.2l-.23.79h-1.34l-.3.46h.65l.16.93c.01.09.1.13.23.13h.2l-.2.77h-.73c-.37.02-.57-.1-.58-.38l-.18-.85-.6.9a.65.65 0 0 1-.65.36h-1.1l.22-.77h.34a.46.46 0 0 0 .36-.19l.94-1.36h-1.2l.22-.8h1.3l.21-.73h-1.3l.22-.8zM9.8 8.69h.92l-.1.54.12-.16a1.43 1.43 0 0 1 1.1-.48 1 1 0 0 1 .83.34 1.15 1.15 0 0 1 .14.95l-.5 2.56h-.95l.46-2.32a.74.74 0 0 0-.04-.53.44.44 0 0 0-.4-.17.88.88 0 0 0-.62.23 1.14 1.14 0 0 0-.34.63L10 12.44h-.94zm10.55 0h.92l-.1.54.13-.16a1.43 1.43 0 0 1 1.08-.48.99.99 0 0 1 .85.34 1.14 1.14 0 0 1 .13.95l-.5 2.56h-.95l.46-2.32a.75.75 0 0 0-.04-.53.45.45 0 0 0-.4-.17.89.89 0 0 0-.62.23 1.12 1.12 0 0 0-.33.63l-.43 2.16h-.94zm4.55-2.33h2.67a1.8 1.8 0 0 1 1.19.35 1.25 1.25 0 0 1 .4 1v.02a3.77 3.77 0 0 1-.06.59 2.38 2.38 0 0 1-.81 1.4 2.29 2.29 0 0 1-1.5.52h-1.44l-.44 2.2h-1.24zm.67 2.82h1.19a1.14 1.14 0 0 0 .73-.21 1.14 1.14 0 0 0 .36-.67l.03-.15v-.13a.52.52 0 0 0-.22-.47 1.35 1.35 0 0 0-.72-.15h-1zm9.15 3.98a5.91 5.91 0 0 1-.98 1.56 1.99 1.99 0 0 1-1.7.71l.08-.64c.89-.27 1.36-1.51 1.64-2.06l-.33-4.03.68-.01h.58l.06 2.53 1.07-2.53h1.09zM31.68 9l-.43.3a1.35 1.35 0 0 0-1.66-.21c-1.08.5-1.98 4.4 1 3.11l.17.2 1.17.04.77-3.54zm-.66 1.92c-.2.56-.61.94-.94.83-.33-.1-.45-.64-.26-1.2.19-.57.61-.94.94-.83.33.1.45.64.26 1.2"
    }
  )
);
var cup_default = CupIcon;

// src/utils/custom-hooks/use-media-query.ts
var import_hooks3 = require("preact/hooks");
function useMediaQuery(query) {
  const getMatch = () => window.matchMedia(query).matches;
  const [matches, setMatches] = (0, import_hooks3.useState)(getMatch);
  (0, import_hooks3.useEffect)(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => {
      mediaQueryList.removeEventListener("change", listener);
    };
  }, [query]);
  return matches;
}

// src/utils/renderBrandIcons.tsx
function RenderBrandIcons({ brands, brandHidden = [], limit = 3 }) {
  const isWidth380 = useMediaQuery("(max-width: 380px)");
  const isWidth335 = useMediaQuery("(max-width: 335px)");
  const widthLimit = isWidth335 ? 1 : isWidth380 ? 2 : limit;
  const brandToShow = brands.filter((brand) => {
    const { brand: brandName } = brand;
    const hidden = brandHidden.some((x) => x.brand === brandName);
    return !hidden;
  });
  return /* @__PURE__ */ (0, import_preact14.h)(import_preact14.Fragment, null, brandToShow.map(({ brand }, index) => {
    if (index >= Math.min(limit, widthLimit)) {
      if (index === Math.min(limit, widthLimit)) {
        return /* @__PURE__ */ (0, import_preact14.h)(
          Tooltip,
          {
            content: /* @__PURE__ */ (0, import_preact14.h)("span", { style: { display: "flex", gap: "4px", overflow: "visible" } }, brandToShow.slice(Math.min(limit, widthLimit)).map(({ brand: brand2 }) => /* @__PURE__ */ (0, import_preact14.h)(RenderBrandIcon, { key: brand2, brand: brand2 })))
          },
          /* @__PURE__ */ (0, import_preact14.h)("span", { key: brand, className: "straumur__render-brand-icons__overflow" }, "+", brandToShow.length - Math.min(limit, widthLimit))
        );
      }
      return null;
    }
    return /* @__PURE__ */ (0, import_preact14.h)(RenderBrandIcon, { key: brand, brand });
  }));
}
var RenderBrandIcon = ({ brand }) => {
  switch (brand) {
    case "visa":
      return /* @__PURE__ */ (0, import_preact14.h)(visa_default, null);
    case "mc":
      return /* @__PURE__ */ (0, import_preact14.h)(mastercard_default, null);
    case "maestro":
      return /* @__PURE__ */ (0, import_preact14.h)(maestro_default, null);
    case "amex":
      return /* @__PURE__ */ (0, import_preact14.h)(amex_default, null);
    case "jcb":
      return /* @__PURE__ */ (0, import_preact14.h)(jcb_default, null);
    case "diners":
      return /* @__PURE__ */ (0, import_preact14.h)(diners_default, null);
    case "discover":
      return /* @__PURE__ */ (0, import_preact14.h)(discover_default, null);
    case "cup":
      return /* @__PURE__ */ (0, import_preact14.h)(cup_default, null);
    default:
      return /* @__PURE__ */ (0, import_preact14.h)("span", null, brand);
  }
};

// src/assets/icons/loader.tsx
var import_preact15 = require("preact");
var LoaderIcon = () => /* @__PURE__ */ (0, import_preact15.h)("svg", { width: "40", height: "40", viewBox: "0 0 40 40", xmlns: "http://www.w3.org/2000/svg", stroke: "#002649" }, /* @__PURE__ */ (0, import_preact15.h)("g", { fill: "none", "fill-rule": "evenodd" }, /* @__PURE__ */ (0, import_preact15.h)("g", { transform: "translate(2 2)", "stroke-width": "4" }, /* @__PURE__ */ (0, import_preact15.h)("circle", { "stroke-opacity": ".3", cx: "18", cy: "18", r: "18" }), /* @__PURE__ */ (0, import_preact15.h)("path", { d: "M36 18c0-9.94-8.06-18-18-18" }, /* @__PURE__ */ (0, import_preact15.h)(
  "animateTransform",
  {
    attributeName: "transform",
    type: "rotate",
    from: "0 18 18",
    to: "360 18 18",
    dur: "1s",
    repeatCount: "indefinite"
  }
)))));
var loader_default = LoaderIcon;

// src/assets/icons/checkmark.tsx
var import_preact16 = require("preact");
var CheckmarkIcon = () => /* @__PURE__ */ (0, import_preact16.h)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "13", viewBox: "0 0 16 13", fill: "none" }, /* @__PURE__ */ (0, import_preact16.h)("path", { d: "M2 7L6 11L14 2", stroke: "#002649", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }));
var checkmark_default = CheckmarkIcon;

// src/features/card/card-component.tsx
function CardComponent({ configuration, paymentMethods }) {
  const cardElementRef = (0, import_hooks4.useRef)(null);
  const adyenCardRef = (0, import_hooks4.useRef)();
  const customCardRef = (0, import_hooks4.useRef)();
  const [payButtonDisabled, setPayButtonDisabled] = (0, import_hooks4.useState)(true);
  const [securityCodePolicy, setSecurityCodePolicy] = (0, import_hooks4.useState)("required");
  const [storePaymentMethod, setStorePaymentMethod] = (0, import_hooks4.useState)(false);
  const storePaymentMethodRef = (0, import_hooks4.useRef)(false);
  const [brandHidden, setBrandHidden] = (0, import_hooks4.useState)([]);
  const [formErrors, setFormErrors] = (0, import_hooks4.useState)({
    encryptedCardNumber: { visible: false },
    encryptedExpiryDate: { visible: false },
    encryptedSecurityCode: { visible: false }
  });
  if (!paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "scheme")) {
    return null;
  }
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    threeDSecureRef,
    handleSuccess,
    handleError,
    setThreeDSecureActive
  } = usePaymentMethodGroup();
  const schemeBrands = paymentMethods.paymentMethods.paymentMethods.find((x) => x.type === "scheme").brands;
  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await (0, import_adyen_web.AdyenCheckout)({
      clientKey: paymentMethods.clientKey,
      locale: configuration.locale,
      environment: configuration.environment,
      countryCode: "IS",
      paymentMethodsResponse: paymentMethods.paymentMethods,
      onError: handleOnError,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed
    });
    customCardRef.current = new import_adyen_web.CustomCard(adyenCardRef.current, {
      placeholders: configuration.placeholders,
      challengeWindowSize: "05",
      // looks like not working
      brands: schemeBrands,
      onBrand: (event) => {
        setSecurityCodePolicy(event.cvcPolicy);
        if (event.brand === "card") {
          setBrandHidden([]);
          return;
        }
        setBrandHidden(
          schemeBrands.filter((x) => x !== event.brand).map((x) => {
            return {
              brand: x
            };
          })
        );
      },
      onConfigSuccess() {
        updatePaymentMethodInitialization("card", true);
      },
      onValidationError: (event) => {
        const defaultErrors = {
          encryptedCardNumber: { visible: false, message: void 0 },
          encryptedExpiryDate: { visible: false, message: void 0 },
          encryptedSecurityCode: { visible: false, message: void 0 }
        };
        event.filter((x) => x.error).forEach((x) => {
          defaultErrors[x.fieldType].visible = true;
          defaultErrors[x.fieldType].message = x.errorI18n;
        });
        setFormErrors(defaultErrors);
      },
      onAllValid: (event) => {
        setPayButtonDisabled(!event.allValid);
      }
    });
    if (cardElementRef.current) {
      customCardRef.current.mount(cardElementRef.current);
    }
  };
  (0, import_hooks4.useEffect)(() => {
    if (activePaymentMethod === "card" && !isPaymentMethodInitialized.card) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);
  (0, import_hooks4.useEffect)(() => {
    if (customCardRef.current && isPaymentMethodInitialized.card) {
      initializeAdyenComponent();
      setFormErrors({
        encryptedCardNumber: { visible: false, message: void 0 },
        encryptedExpiryDate: { visible: false, message: void 0 },
        encryptedSecurityCode: { visible: false, message: void 0 }
      });
    }
  }, [configuration]);
  const handleBoxChange = () => {
    setActivePaymentMethod("card");
  };
  if (paymentMethods.paymentMethods?.paymentMethods?.length === 0) {
    return null;
  }
  const brands = schemeBrands.map((x) => {
    return { brand: x, brandFullName: x };
  });
  function handleStorePaymentMethodChange(event) {
    setStorePaymentMethod(event.currentTarget.checked);
  }
  function handleOnError(_, __) {
    handleError("error.unknownError");
  }
  (0, import_hooks4.useEffect)(() => {
    storePaymentMethodRef.current = storePaymentMethod;
  }, [storePaymentMethod]);
  async function handleOnSubmit(state, _, actions) {
    const data = {
      ...state.data,
      origin: window.location.origin,
      storePaymentMethod: storePaymentMethodRef.current,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createPaymentRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }
    const { resultCode, action } = response;
    if (resultCode === "RedirectShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
      adyenCardRef.current.createFromAction(action).mount(threeDSecureRef?.current);
      return;
    }
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  async function handleOnSubmitAdditionalData(state, _, actions) {
    const data = {
      ...state.data,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createDetailsRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }
    const { resultCode, action } = response;
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  function handleSubmitClick() {
    if (!customCardRef.current) return;
    customCardRef.current.submit();
  }
  return /* @__PURE__ */ (0, import_preact17.h)("label", { className: "straumur__card-component" }, /* @__PURE__ */ (0, import_preact17.h)(
    "input",
    {
      type: "radio",
      className: "straumur__card-component__radio-selector",
      checked: activePaymentMethod === "card",
      onChange: handleBoxChange
    }
  ), /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component__content" }, /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component--circle" }), /* @__PURE__ */ (0, import_preact17.h)(card_default, null), /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component--text" }, i18n(configuration.locale, "cards.title")), /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component--brands" }, /* @__PURE__ */ (0, import_preact17.h)(RenderBrandIcons, { brands, brandHidden }))), /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__expandable", ref: cardElementRef }, !isPaymentMethodInitialized.card && /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__loading-text" }, /* @__PURE__ */ (0, import_preact17.h)(loader_default, null)), /* @__PURE__ */ (0, import_preact17.h)(
    "div",
    {
      className: "straumur__card-component__form",
      style: {
        opacity: isPaymentMethodInitialized.card ? 1 : 0,
        position: isPaymentMethodInitialized.card ? "relative" : "absolute",
        transition: "opacity 0.3s ease-in-out"
      }
    },
    /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__form--wrapper" }, /* @__PURE__ */ (0, import_preact17.h)(
      "label",
      {
        className: `${"straumur__card-component__form--wrapper--label"} ${formErrors.encryptedCardNumber.visible ? "straumur__card-component__form--wrapper--label--error" : ""}`
      },
      i18n(configuration.locale, "cards.cardNumber")
    ), /* @__PURE__ */ (0, import_preact17.h)(
      "span",
      {
        className: `${"straumur__card-component__form--wrapper--input"} ${formErrors.encryptedCardNumber.visible ? "straumur__card-component__form--wrapper--input--error" : ""}`,
        "data-cse": "encryptedCardNumber"
      }
    ), formErrors.encryptedCardNumber.visible && /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component__form--wrapper--error" }, formErrors.encryptedCardNumber.message)),
    /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__form--field-wrapper" }, /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__form--wrapper" }, /* @__PURE__ */ (0, import_preact17.h)(
      "label",
      {
        className: `${"straumur__card-component__form--wrapper--label"} ${formErrors.encryptedExpiryDate.visible ? "card-component__form--wrapper--label--error" : ""}`
      },
      i18n(configuration.locale, "cards.expiryDate")
    ), /* @__PURE__ */ (0, import_preact17.h)(
      "span",
      {
        className: `${"straumur__card-component__form--wrapper--input"} ${formErrors.encryptedExpiryDate.visible ? "straumur__card-component__form--wrapper--input--error" : ""}`,
        "data-cse": "encryptedExpiryDate"
      }
    ), formErrors.encryptedExpiryDate.visible && /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component__form--wrapper--error" }, formErrors.encryptedExpiryDate.message)), /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__form--wrapper" }, (securityCodePolicy === "optional" || securityCodePolicy === "required") && /* @__PURE__ */ (0, import_preact17.h)(import_preact17.Fragment, null, /* @__PURE__ */ (0, import_preact17.h)(
      "label",
      {
        className: `${"straumur__card-component__form--wrapper--label"} ${formErrors.encryptedSecurityCode.visible ? "straumur__card-component__form--wrapper--label--error" : ""}`
      },
      securityCodePolicy === "optional" ? i18n(configuration.locale, "cards.securityCode3DigitsOptional") : i18n(configuration.locale, "cards.securityCode3Digits")
    ), /* @__PURE__ */ (0, import_preact17.h)(
      "span",
      {
        className: `${"straumur__card-component__form--wrapper--input"} ${formErrors.encryptedSecurityCode.visible ? "straumur__card-component__form--wrapper--input--error" : ""}`,
        "data-cse": "encryptedSecurityCode"
      }
    ), formErrors.encryptedSecurityCode.visible && /* @__PURE__ */ (0, import_preact17.h)("span", { className: "straumur__card-component__form--wrapper--error" }, formErrors.encryptedSecurityCode.message), /* @__PURE__ */ (0, import_preact17.h)("div", { className: "straumur__card-component__form--wrapper--label--info" }, /* @__PURE__ */ (0, import_preact17.h)(Tooltip, { content: /* @__PURE__ */ (0, import_preact17.h)("span", null, i18n(configuration.locale, "cards.securityCode3DigitsInfo")) }, /* @__PURE__ */ (0, import_preact17.h)(info_default, null)))))),
    paymentMethods.enableStoreDetails === "AskForConsent" && /* @__PURE__ */ (0, import_preact17.h)("label", { className: "straumur__card-component__form--wrapper--label-checkbox" }, /* @__PURE__ */ (0, import_preact17.h)(
      "div",
      {
        className: `${"straumur__card-component__form--wrapper--label-checkbox--checkmark"} ${storePaymentMethod ? "straumur__card-component__form--wrapper--label-checkbox--checkmark--checked" : ""}`
      },
      /* @__PURE__ */ (0, import_preact17.h)(
        "div",
        {
          className: `${"straumur__card-component__form--wrapper--label-checkbox--checkmark--icon"} ${storePaymentMethod ? "straumur__card-component__form--wrapper--label-checkbox--checkmark--icon--checked" : ""}`
        },
        /* @__PURE__ */ (0, import_preact17.h)(checkmark_default, null)
      )
    ), /* @__PURE__ */ (0, import_preact17.h)(
      "input",
      {
        type: "checkbox",
        className: "straumur__card-component__form--wrapper--label-checkbox--checkbox",
        checked: storePaymentMethod,
        onChange: handleStorePaymentMethodChange
      }
    ), i18n(configuration.locale, "cards.storePaymentMethod")),
    /* @__PURE__ */ (0, import_preact17.h)(
      "button",
      {
        className: "straumur__card-component__submit-button",
        disabled: payButtonDisabled,
        onClick: handleSubmitClick
      },
      paymentMethods.formattedAmount
    )
  )));
}
var card_component_default = CardComponent;

// src/features/google-pay/google-pay-component.tsx
var import_preact19 = require("preact");
var import_hooks5 = require("preact/hooks");

// src/features/google-pay/google-pay-component.css
styleInject('.straumur__google-pay-component {\n  position: relative;\n  cursor: pointer;\n  background: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-lg);\n  transition: all 0.3s ease;\n  padding: var(--straumur__space-xxlg) var(--straumur__space-5xlg);\n}\n.straumur__google-pay-component__radio-selector {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n}\n.straumur__google-pay-component__content {\n  display: flex;\n  align-items: center;\n  gap: var(--straumur__space-lg);\n  transition: background-color 0.3s ease;\n}\n.straumur__google-pay-component__radio-selector:checked + .straumur__google-pay-component__content {\n  padding-bottom: var(--straumur__space-xxlg);\n}\n.straumur__google-pay-component--circle {\n  width: var(--straumur__space-5xlg);\n  height: var(--straumur__space-5xlg);\n  border: 1px solid var(--straumur__color-cosmos-blue-gamma);\n  background: var(--straumur__color-secondary-gamma);\n  border-radius: 50%;\n  position: relative;\n  transition: all 0.3s ease;\n}\n.straumur__google-pay-component__content:hover .straumur__google-pay-component--circle {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__google-pay-component--circle::after {\n  content: "";\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%) scale(0);\n  transition: transform 0.2s ease;\n}\n.straumur__google-pay-component__radio-selector:checked + .straumur__google-pay-component__content .straumur__google-pay-component--circle {\n  background: var(--straumur__color-blue-beta);\n  border-color: var(--straumur__color-transparent);\n}\n.straumur__google-pay-component__radio-selector:checked + .straumur__google-pay-component__content .straumur__google-pay-component--circle::after {\n  transform: translate(-50%, -50%) scale(1);\n  background: var(--straumur__color-primary);\n  height: var(--straumur__space-md);\n  width: var(--straumur__space-md);\n}\n.straumur__google-pay-component--text {\n  color: #213547;\n  font-size: 1rem;\n  user-select: none;\n}\n.straumur__google-pay-component__expandable {\n  background: var(--straumur__color-white);\n  max-height: 0;\n  overflow: hidden;\n  transition: all 0.3s ease;\n  opacity: 0;\n}\n.straumur__google-pay-component__radio-selector:checked ~ .straumur__google-pay-component__expandable {\n  max-height: 400px;\n  opacity: 1;\n}\n.straumur__google-pay-component__expandable p {\n  margin: 0;\n  color: #213547;\n  font-size: 0.9rem;\n}\n');

// src/features/google-pay/google-pay-component.tsx
var import_adyen_web2 = require("@adyen/adyen-web");

// src/assets/icons/googlepay.tsx
var import_preact18 = require("preact");
var GooglePayIcon = () => /* @__PURE__ */ (0, import_preact18.h)(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "26",
    fill: "none",
    viewBox: "0 0 40 26"
  },
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#fff",
      d: "M29.13 2.41H10.87C5.17 2.41.5 7.18.5 13.01a10.5 10.5 0 0 0 10.37 10.58h18.26c5.7 0 10.37-4.76 10.37-10.59 0-5.82-4.67-10.59-10.37-10.59Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#3C4043",
      d: "M29.13 3.27c1.28 0 2.52.26 3.7.77a9.6 9.6 0 0 1 5.08 5.19 9.78 9.78 0 0 1 0 7.55 9.83 9.83 0 0 1-5.08 5.18 9.26 9.26 0 0 1-3.7.77H10.87a9.24 9.24 0 0 1-3.7-.77 9.6 9.6 0 0 1-5.08-5.18 9.78 9.78 0 0 1 0-7.55 9.83 9.83 0 0 1 5.08-5.19 9.24 9.24 0 0 1 3.7-.77h18.26Zm0-.86H10.87C5.17 2.41.5 7.18.5 13.01a10.5 10.5 0 0 0 10.37 10.58h18.26c5.7 0 10.37-4.76 10.37-10.59 0-5.82-4.67-10.59-10.37-10.59Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#3C4043",
      d: "M19.1 13.75v3.2h-1v-7.9h2.64c.67 0 1.24.23 1.7.68.49.46.72 1.01.72 1.67a2.2 2.2 0 0 1-.71 1.68c-.46.45-1.03.67-1.7.67H19.1Zm0-3.73v2.76h1.66c.4 0 .73-.14.99-.4.26-.28.4-.6.4-.98 0-.36-.14-.68-.4-.95a1.28 1.28 0 0 0-.99-.42H19.1Zm6.67 1.35c.73 0 1.31.2 1.74.6.42.4.64.95.64 1.65v3.34h-.95v-.76h-.04a1.9 1.9 0 0 1-1.65.93 2.1 2.1 0 0 1-1.46-.53c-.4-.35-.6-.8-.6-1.32 0-.56.21-1 .63-1.34.41-.33.97-.5 1.66-.5.59 0 1.07.12 1.45.34v-.23c0-.36-.13-.65-.4-.9a1.4 1.4 0 0 0-.97-.37c-.56 0-1 .24-1.32.72l-.88-.56a2.42 2.42 0 0 1 2.15-1.07Zm-1.29 3.92c0 .27.11.5.33.67.22.17.48.26.78.26.42 0 .79-.16 1.12-.48.32-.31.49-.68.49-1.11a2.02 2.02 0 0 0-1.3-.38c-.4 0-.74.1-1.01.3a.9.9 0 0 0-.4.74Zm9.08-3.75-3.32 7.8h-1.02l1.23-2.73-2.19-5.07h1.09l1.57 3.89h.02l1.54-3.89h1.08Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#4285F4",
      d: "M15.14 13.1c0-.32-.03-.64-.09-.95h-4.17v1.75h2.4a2.1 2.1 0 0 1-.89 1.4v1.14h1.43a4.49 4.49 0 0 0 1.32-3.33Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#34A853",
      d: "M12.4 15.3a2.66 2.66 0 0 1-4-1.44H6.9v1.18a4.43 4.43 0 0 0 6.91 1.4l-1.43-1.13Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#FABB05",
      d: "M8.25 13c0-.3.05-.59.14-.86v-1.17H6.9a4.59 4.59 0 0 0 0 4.07l1.48-1.17a2.79 2.79 0 0 1-.14-.86Z"
    }
  ),
  /* @__PURE__ */ (0, import_preact18.h)(
    "path",
    {
      fill: "#E94235",
      d: "M10.88 10.27c.66 0 1.24.23 1.7.68l1.27-1.3a4.22 4.22 0 0 0-2.97-1.18 4.44 4.44 0 0 0-3.97 2.5l1.48 1.17a2.66 2.66 0 0 1 2.5-1.87Z"
    }
  )
);
var googlepay_default = GooglePayIcon;

// src/features/google-pay/google-pay-component.tsx
function GooglePayComponent({ configuration, paymentMethods }) {
  const googlePayElementRef = (0, import_hooks5.useRef)(null);
  const adyenCardRef = (0, import_hooks5.useRef)();
  const googlePayRef = (0, import_hooks5.useRef)();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    threeDSecureRef,
    handleSuccess,
    handleError,
    setThreeDSecureActive
  } = usePaymentMethodGroup();
  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await (0, import_adyen_web2.AdyenCheckout)({
      clientKey: paymentMethods.clientKey,
      locale: paymentMethods.locale,
      environment: configuration.environment,
      countryCode: "IS",
      onError: handleOnError,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed
    });
    const gpayConfig = paymentMethods.paymentMethods.paymentMethods.find((x) => x.type === "googlepay").configuration;
    const googlePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency
      },
      countryCode: "IS",
      environment: configuration.environment,
      configuration: {
        ...gpayConfig,
        merchantName: paymentMethods.merchantName
      }
    };
    googlePayRef.current = new import_adyen_web2.GooglePay(adyenCardRef.current, googlePayConfiguration);
    googlePayRef.current.isAvailable().then(() => {
      googlePayRef.current.mount(googlePayElementRef.current);
      updatePaymentMethodInitialization("googlepay", true);
    }).catch((e) => {
      handleError("error.googlePayNotAvailable");
    });
  };
  (0, import_hooks5.useEffect)(() => {
    if (activePaymentMethod === "googlepay" && !isPaymentMethodInitialized.googlepay) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);
  (0, import_hooks5.useEffect)(() => {
    if (googlePayRef.current && isPaymentMethodInitialized.googlepay) {
      initializeAdyenComponent();
    }
  }, [configuration]);
  const handleBoxChange = () => {
    setActivePaymentMethod("googlepay");
  };
  function handleOnError(_, __) {
    handleError("error.unknownError");
  }
  async function handleOnSubmit(state, _, actions) {
    const data = {
      ...state.data,
      origin: window.location.origin,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createPaymentRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }
    const { resultCode, action } = response;
    if (resultCode === "RedirectShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
      adyenCardRef.current.createFromAction(action).mount(threeDSecureRef?.current);
      return;
    }
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  async function handleOnSubmitAdditionalData(state, _, actions) {
    const data = {
      ...state.data,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createDetailsRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }
    const { resultCode, action } = response;
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  const hasGooglePay = paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "googlepay");
  if (!hasGooglePay) {
    return null;
  }
  return /* @__PURE__ */ (0, import_preact19.h)("label", { className: "straumur__google-pay-component" }, /* @__PURE__ */ (0, import_preact19.h)(
    "input",
    {
      type: "radio",
      className: "straumur__google-pay-component__radio-selector",
      checked: activePaymentMethod === "googlepay",
      onChange: handleBoxChange
    }
  ), /* @__PURE__ */ (0, import_preact19.h)("span", { className: "straumur__google-pay-component__content" }, /* @__PURE__ */ (0, import_preact19.h)("span", { className: "straumur__google-pay-component--circle" }), /* @__PURE__ */ (0, import_preact19.h)(googlepay_default, null), /* @__PURE__ */ (0, import_preact19.h)("span", { className: "straumur__google-pay-component--text" }, i18n(configuration.locale, "googlePay.title"))), /* @__PURE__ */ (0, import_preact19.h)("div", { className: "straumur__google-pay-component__expandable" }, /* @__PURE__ */ (0, import_preact19.h)("div", { ref: googlePayElementRef })));
}
var google_pay_component_default = GooglePayComponent;

// src/features/apple-pay/apple-pay-component.tsx
var import_preact21 = require("preact");
var import_hooks6 = require("preact/hooks");

// src/features/apple-pay/apple-pay-component.css
styleInject('.straumur__apple-pay-component {\n  position: relative;\n  cursor: pointer;\n  background: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-lg);\n  transition: all 0.3s ease;\n  padding: var(--straumur__space-xxlg) var(--straumur__space-5xlg);\n}\n.straumur__apple-pay-component__radio-selector {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n}\n.straumur__apple-pay-component__content {\n  display: flex;\n  align-items: center;\n  gap: var(--straumur__space-lg);\n  transition: background-color 0.3s ease;\n}\n.straumur__apple-pay-component__radio-selector:checked + .straumur__apple-pay-component__content {\n  padding-bottom: var(--straumur__space-xxlg);\n}\n.straumur__apple-pay-component--circle {\n  width: var(--straumur__space-5xlg);\n  height: var(--straumur__space-5xlg);\n  border: 1px solid var(--straumur__color-cosmos-blue-gamma);\n  background: var(--straumur__color-secondary-gamma);\n  border-radius: 50%;\n  position: relative;\n  transition: all 0.3s ease;\n}\n.straumur__apple-pay-component__content:hover .straumur__apple-pay-component--circle {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__apple-pay-component--circle::after {\n  content: "";\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%) scale(0);\n  transition: transform 0.2s ease;\n}\n.straumur__apple-pay-component__radio-selector:checked + .straumur__apple-pay-component__content .straumur__apple-pay-component--circle {\n  background: var(--straumur__color-blue-beta);\n  border-color: var(--straumur__color-transparent);\n}\n.straumur__apple-pay-component__radio-selector:checked + .straumur__apple-pay-component__content .straumur__apple-pay-component--circle::after {\n  transform: translate(-50%, -50%) scale(1);\n  background: var(--straumur__color-primary);\n  height: var(--straumur__space-md);\n  width: var(--straumur__space-md);\n}\n.straumur__apple-pay-component--text {\n  color: #213547;\n  font-size: 1rem;\n  user-select: none;\n}\n.straumur__apple-pay-component__expandable {\n  background: var(--straumur__color-white);\n  max-height: 0;\n  overflow: hidden;\n  transition: all 0.3s ease;\n  opacity: 0;\n}\n.straumur__apple-pay-component__radio-selector:checked ~ .straumur__apple-pay-component__expandable {\n  max-height: 400px;\n  opacity: 1;\n}\n.straumur__apple-pay-component__expandable p {\n  margin: 0;\n  color: #213547;\n  font-size: 0.9rem;\n}\n');

// src/features/apple-pay/apple-pay-component.tsx
var import_adyen_web3 = require("@adyen/adyen-web");

// src/assets/icons/applepay.tsx
var import_preact20 = require("preact");
var ApplePayIcon = () => /* @__PURE__ */ (0, import_preact20.h)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "40", height: "26", fill: "none", viewBox: "0 0 40 26" }, /* @__PURE__ */ (0, import_preact20.h)(
  "path",
  {
    fill: "#000",
    d: "M36.42 0H3.58a69.25 69.25 0 0 0-.75 0c-.25.01-.5.03-.76.07a2.51 2.51 0 0 0-1.32.7A2.43 2.43 0 0 0 .07 2.1 5.14 5.14 0 0 0 0 3.22v19.91c.01.25.03.51.07.76a2.6 2.6 0 0 0 .68 1.35 2.39 2.39 0 0 0 1.32.69 4.98 4.98 0 0 0 1.1.07h34a5 5 0 0 0 .76-.07 2.5 2.5 0 0 0 1.32-.7 2.44 2.44 0 0 0 .68-1.34 5.13 5.13 0 0 0 .07-1.11V2.87a6.5 6.5 0 0 0-.07-.76 2.58 2.58 0 0 0-.68-1.35 2.4 2.4 0 0 0-1.32-.69 4.96 4.96 0 0 0-1.1-.07h-.41Z"
  }
), /* @__PURE__ */ (0, import_preact20.h)(
  "path",
  {
    fill: "#fff",
    d: "M36.42.87h.73c.2 0 .42.02.62.06a1.67 1.67 0 0 1 .88.44 1.58 1.58 0 0 1 .44.89 4.38 4.38 0 0 1 .06.97v19.55a14.67 14.67 0 0 1-.06.96 1.7 1.7 0 0 1-.44.89 1.54 1.54 0 0 1-.87.44 4.27 4.27 0 0 1-.96.06H2.85a3.7 3.7 0 0 1-.63-.06 1.66 1.66 0 0 1-.87-.45 1.56 1.56 0 0 1-.44-.88 4.35 4.35 0 0 1-.06-.97V2.9c.01-.2.02-.42.06-.63.03-.18.08-.34.16-.49A1.56 1.56 0 0 1 2.22.93a4.2 4.2 0 0 1 .96-.06h33.24"
  }
), /* @__PURE__ */ (0, import_preact20.h)(
  "path",
  {
    fill: "#000",
    d: "M10.92 8.61c.34-.43.57-1 .51-1.59a2.21 2.21 0 0 0-1.99 2.3c.56.04 1.12-.3 1.48-.7Zm.51.81c-.82-.05-1.52.46-1.9.46-.4 0-1-.43-1.64-.42-.84 0-1.62.48-2.05 1.24-.88 1.52-.23 3.76.62 5 .42.6.92 1.27 1.58 1.25.62-.02.86-.4 1.62-.4.75 0 .97.4 1.63.39.69-.01 1.11-.61 1.53-1.22.47-.7.67-1.37.68-1.4-.01-.02-1.32-.52-1.33-2.02-.01-1.26 1.03-1.85 1.07-1.9a2.34 2.34 0 0 0-1.81-.98Zm7.11-1.7a2.87 2.87 0 0 1 3.02 3c0 1.8-1.27 3.03-3.06 3.03h-1.97v3.12h-1.42V7.72h3.43Zm-2 4.83h1.62c1.24 0 1.94-.66 1.94-1.82 0-1.15-.7-1.81-1.93-1.81h-1.64v3.63Zm5.39 2.43c0-1.17.9-1.89 2.48-1.98l1.83-.1v-.52c0-.74-.5-1.18-1.34-1.18-.8 0-1.3.38-1.41.97h-1.3c.08-1.2 1.1-2.09 2.76-2.09 1.62 0 2.65.86 2.65 2.2v4.6h-1.31v-1.1h-.04a2.38 2.38 0 0 1-2.1 1.2c-1.3 0-2.22-.8-2.22-2Zm4.3-.6v-.53l-1.64.1c-.82.06-1.28.42-1.28.99 0 .58.48.96 1.22.96.96 0 1.7-.66 1.7-1.52Zm2.61 4.95v-1.11c.1.03.33.03.44.03.64 0 .98-.27 1.19-.96l.12-.4-2.41-6.69h1.48l1.7 5.43h.02l1.69-5.43h1.44l-2.5 7.02c-.57 1.62-1.23 2.14-2.61 2.14a5.3 5.3 0 0 1-.56-.03Z"
  }
));
var applepay_default = ApplePayIcon;

// src/features/apple-pay/apple-pay-component.tsx
function ApplePayComponent({ configuration, paymentMethods }) {
  const applePayElementRef = (0, import_hooks6.useRef)(null);
  const adyenCardRef = (0, import_hooks6.useRef)();
  const applePayRef = (0, import_hooks6.useRef)();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    threeDSecureRef,
    handleSuccess,
    handleError,
    setThreeDSecureActive
  } = usePaymentMethodGroup();
  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await (0, import_adyen_web3.AdyenCheckout)({
      clientKey: paymentMethods.clientKey,
      locale: paymentMethods.locale,
      environment: configuration.environment,
      countryCode: "IS",
      onError: handleOnError,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed
    });
    const gpayConfig = paymentMethods.paymentMethods.paymentMethods.find((x) => x.type === "applepay").configuration;
    const applePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency
      },
      environment: configuration.environment,
      configuration: {
        ...gpayConfig,
        merchantName: paymentMethods.merchantName
      }
    };
    applePayRef.current = new import_adyen_web3.ApplePay(adyenCardRef.current, applePayConfiguration);
    applePayRef.current.isAvailable().then(() => {
      applePayRef.current.mount(applePayElementRef.current);
      updatePaymentMethodInitialization("applepay", true);
    }).catch((e) => {
      console.log(e);
      handleError("error.applePayNotAvailable");
    });
  };
  (0, import_hooks6.useEffect)(() => {
    if (activePaymentMethod === "applepay" && !isPaymentMethodInitialized.applepay) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);
  (0, import_hooks6.useEffect)(() => {
    if (applePayRef.current && isPaymentMethodInitialized.applepay) {
      initializeAdyenComponent();
    }
  }, [configuration]);
  const handleBoxChange = () => {
    setActivePaymentMethod("applepay");
  };
  function handleOnError(_, __) {
    handleError("error.unknownError");
  }
  async function handleOnSubmit(state, _, actions) {
    const data = {
      ...state.data,
      origin: window.location.origin,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createPaymentRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }
    const { resultCode, action } = response;
    if (resultCode === "RedirectShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
      adyenCardRef.current.createFromAction(action).mount(threeDSecureRef?.current);
      return;
    }
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  async function handleOnSubmitAdditionalData(state, _, actions) {
    const data = {
      ...state.data,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createDetailsRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }
    const { resultCode, action } = response;
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  const hasApplePay = paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "applepay");
  if (!hasApplePay) {
    return null;
  }
  return /* @__PURE__ */ (0, import_preact21.h)("label", { className: "straumur__apple-pay-component" }, /* @__PURE__ */ (0, import_preact21.h)(
    "input",
    {
      type: "radio",
      className: "straumur__apple-pay-component__radio-selector",
      checked: activePaymentMethod === "applepay",
      onChange: handleBoxChange
    }
  ), /* @__PURE__ */ (0, import_preact21.h)("span", { className: "straumur__apple-pay-component__content" }, /* @__PURE__ */ (0, import_preact21.h)("span", { className: "straumur__apple-pay-component--circle" }), /* @__PURE__ */ (0, import_preact21.h)(applepay_default, null), /* @__PURE__ */ (0, import_preact21.h)("span", { className: "straumur__apple-pay-component--text" }, i18n(configuration.locale, "applePay.title"))), /* @__PURE__ */ (0, import_preact21.h)("div", { className: "straumur__apple-pay-component__expandable" }, /* @__PURE__ */ (0, import_preact21.h)("div", { ref: applePayElementRef })));
}
var apple_pay_component_default = ApplePayComponent;

// src/features/stored-card/stored-card-container-component.tsx
var import_preact24 = require("preact");

// src/features/stored-card/stored-card-component.tsx
var import_preact23 = require("preact");
var import_hooks7 = require("preact/hooks");

// src/features/stored-card/stored-card-component.css
styleInject('.straumur__stored-card-component {\n  position: relative;\n  background: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-lg);\n  transition: all 0.3s ease;\n  padding: var(--straumur__space-xxlg) var(--straumur__space-5xlg);\n  cursor: pointer;\n}\n.straumur__stored-card-component:has(.straumur__stored-card-component__radio-selector:checked) {\n  cursor: default;\n}\n.straumur__stored-card-component__radio-selector {\n  position: absolute;\n  opacity: 0;\n}\n.straumur__stored-card-component__content {\n  display: flex;\n  align-items: center;\n  gap: var(--straumur__space-lg);\n  transition: background-color 0.3s ease;\n}\n.straumur__stored-card-component__radio-selector:checked + .straumur__stored-card-component__content {\n  padding-bottom: var(--straumur__space-xxlg);\n  cursor: default;\n}\n.straumur__stored-card-component--circle {\n  width: var(--straumur__space-5xlg);\n  height: var(--straumur__space-5xlg);\n  border: 1px solid var(--straumur__color-cosmos-blue-gamma);\n  background: var(--straumur__color-secondary-gamma);\n  border-radius: 50%;\n  position: relative;\n  transition: all 0.3s ease;\n}\n.straumur__stored-card-component__content:hover .straumur__stored-card-component--circle {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__stored-card-component--circle::after {\n  content: "";\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%) scale(0);\n  transition: transform 0.2s ease;\n}\n.straumur__stored-card-component__radio-selector:checked + .straumur__stored-card-component__content .straumur__stored-card-component--circle {\n  background: var(--straumur__color-blue-beta);\n  border-color: var(--straumur__color-transparent);\n}\n.straumur__stored-card-component__radio-selector:checked + .straumur__stored-card-component__content .straumur__stored-card-component--circle::after {\n  transform: translate(-50%, -50%) scale(1);\n  background: var(--straumur__color-primary);\n  height: var(--straumur__space-md);\n  width: var(--straumur__space-md);\n}\n.straumur__stored-card-component--text {\n  color: #213547;\n  font-size: 1rem;\n  user-select: none;\n}\n.straumur__stored-card-component--brands {\n  display: flex;\n  margin-left: auto;\n  align-items: center;\n  gap: var(--straumur__space-xxs);\n}\n.straumur__stored-card-component--brands > svg {\n  transition: all 0.2s ease;\n}\n.straumur__stored-card-component__remove-stored-card-button {\n  margin-left: auto;\n}\n.straumur__stored-card-component__remove-stored-card-button--text {\n  color: #d03e00;\n  text-decoration: none;\n  background: none;\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.straumur__stored-card-component__remove-stored-card-button--text:disabled {\n  cursor: not-allowed;\n  color: #72889d;\n}\n.straumur__stored-card-component__confirm-remove-stored-card {\n  background-color: #fff7db;\n  border-radius: var(--straumur__border-radius-s);\n  max-height: 0;\n  overflow: hidden;\n  transition: all 0.3s ease;\n  opacity: 0;\n}\n.straumur__stored-card-component__confirm-remove-stored-card--expanded {\n  padding: var(--ta jstraumur__space-xxlg);\n  max-height: 400px;\n  opacity: 1;\n}\n.straumur__stored-card-component__confirm-remove-stored-card--header {\n  display: flex;\n  align-items: center;\n  gap: var(--straumur__space-lg);\n  color: #262b31;\n  padding-bottom: var(--straumur__space-xxlg);\n}\n.straumur__stored-card-component__confirm-remove-stored-card--actions {\n  display: flex;\n  gap: var(--straumur__space-lg);\n  justify-content: end;\n}\n.straumur__stored-card-component__confirm-remove-stored-card--actions--button {\n  color: #775d00;\n  background: none;\n  border: none;\n  cursor: pointer;\n  text-decoration: none;\n  font-weight: bold;\n}\n.straumur__stored-card-component__expandable {\n  background: var(--straumur__color-white);\n  max-height: 0;\n  overflow: hidden;\n  transition: all 0.3s ease;\n  opacity: 0;\n}\n.straumur__stored-card-component__loading-text {\n  display: flex;\n  justify-content: center;\n}\n.straumur__stored-card-component__radio-selector:checked ~ .straumur__stored-card-component__expandable {\n  max-height: 400px;\n  opacity: 1;\n}\n.straumur__stored-card-component__form {\n  display: flex;\n  padding-top: var(--straumur__space-xxlg);\n  flex-direction: column;\n  gap: var(--straumur__space-5xlg);\n}\n.straumur__stored-card-component__form--wrapper {\n  display: flex;\n  flex-direction: column;\n  justify-items: start;\n  position: relative;\n  width: 100%;\n}\n.straumur__stored-card-component__form--wrapper--error {\n  color: var(--straumur__color-red-beta);\n  font-size: 12px;\n}\n.straumur__stored-card-component__form--wrapper--label {\n  transform: translateX(10px) translateY(-50%);\n  z-index: 1;\n  background:\n    linear-gradient(\n      to top,\n      var(--straumur__color-secondary-gamma) 53%,\n      var(--straumur__color-transparent) 50%);\n  position: absolute;\n  font-weight: 500;\n  font-size: 14px;\n  padding: 0 var(--straumur__space-xxs);\n}\n.straumur__stored-card-component__form--wrapper--label--readonly {\n  background:\n    linear-gradient(\n      to top,\n      var(--straumur__color-gray-epsilon) 53%,\n      var(--straumur__color-transparent) 50%);\n}\n.straumur__stored-card-component__form--wrapper--label--error {\n  color: var(--straumur__color-red-beta);\n  background:\n    linear-gradient(\n      to top,\n      var(--straumur__color-red-gamma) 53%,\n      var(--straumur__color-transparent) 50%);\n  font-size: 13px;\n  font-weight: 500;\n}\n.straumur__stored-card-component__form--wrapper--label--info {\n  position: absolute;\n  top: 33%;\n  right: var(--straumur__space-md);\n}\n.straumur__stored-card-component__form--wrapper--input {\n  background: var(--straumur__color-secondary-gamma);\n  color: #00112c;\n  display: flex;\n  align-items: center;\n  border: 1px solid var(--straumur__color-transparent);\n  border-radius: var(--straumur__border-radius-s);\n  font-size: 1rem;\n  height: 48px;\n  outline: none;\n  padding-left: var(--straumur__space-lg);\n  transition: border 0.2s ease-out, box-shadow 0.2s ease-out;\n  position: relative;\n}\n.straumur__stored-card-component__form--wrapper--input--readonly {\n  background-color: var(--straumur__color-gray-epsilon);\n}\n.straumur__stored-card-component__form--wrapper--input:hover {\n  border: 1px solid var(--straumur__color-cosmos-blue-delta);\n}\n.straumur__stored-card-component__form--wrapper--input--readonly:hover {\n  border: 1px solid var(--straumur__color-transparent);\n}\n.straumur__stored-card-component__form--wrapper--input--error {\n  background: var(--straumur__color-red-gamma);\n  border: 1px solid var(--straumur__color-red-beta);\n}\n.straumur__stored-card-component__form--wrapper--input--error:hover {\n  border: 1px solid var(--straumur__color-red-beta);\n}\n.straumur__stored-card-component__form--field-wrapper {\n  display: flex;\n  width: 100%;\n  gap: var(--straumur__space-5xlg);\n}\n.straumur__stored-card-component__submit-button {\n  background: var(--straumur__color-primary);\n  border: none;\n  border-radius: var(--straumur__border-radius-s);\n  color: var(--straumur__color-white);\n  cursor: pointer;\n  font-size: 1rem;\n  height: 40px;\n  outline: none;\n  padding: 0 var(--straumur__space-xxlg);\n  transition: background 0.2s ease-out;\n  width: 100%;\n}\n.straumur__stored-card-component__submit-button:hover {\n  background: var(--straumur__color-primary);\n  border: 1px solid #dbdee2;\n}\n.straumur__stored-card-component__submit-button:disabled {\n  background: #72889d;\n  border: 1px solid #dbdee2;\n  cursor: not-allowed;\n}\n');

// src/features/stored-card/stored-card-component.tsx
var import_adyen_web4 = require("@adyen/adyen-web");

// src/assets/icons/warning.tsx
var import_preact22 = require("preact");
var WarningIcon = () => /* @__PURE__ */ (0, import_preact22.h)("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ (0, import_preact22.h)("g", { "clip-path": "url(#clip0_10650_34968)" }, /* @__PURE__ */ (0, import_preact22.h)(
  "path",
  {
    d: "M12.0011 15C12.6245 15 13.1261 14.4984 13.1261 13.875V7.875C13.1261 7.25391 12.6222 6.75 12.0433 6.75C11.4644 6.75 10.8761 7.25625 10.8761 7.875V13.875C10.8761 14.4984 11.3823 15 12.0011 15ZM12.0011 16.5516C11.1873 16.5516 10.5273 17.2116 10.5273 18.0253C10.5292 18.8391 11.1855 19.5 12.0011 19.5C12.8167 19.5 13.4748 18.84 13.4748 18.0262C13.473 17.2125 12.8167 16.5516 12.0011 16.5516Z",
    fill: "#DFAE00"
  }
), /* @__PURE__ */ (0, import_preact22.h)(
  "path",
  {
    opacity: "0.4",
    d: "M23.7312 19.5469L13.7328 2.48438C12.9673 1.17188 11.0356 1.17188 10.2649 2.48438L0.271188 19.5469C-0.49803 20.8547 0.460048 22.5 2.00181 22.5H21.9987C23.5343 22.5 24.4953 20.8594 23.7312 19.5469ZM10.8734 7.875C10.8734 7.25391 11.3773 6.75 11.9984 6.75C12.6195 6.75 13.1234 7.25625 13.1234 7.875V13.875C13.1234 14.4961 12.6195 15 12.0406 15C11.4617 15 10.8734 14.4984 10.8734 13.875V7.875ZM11.9984 19.5C11.1846 19.5 10.5246 18.84 10.5246 18.0262C10.5246 17.2125 11.1842 16.5525 11.9984 16.5525C12.8126 16.5525 13.4721 17.2125 13.4721 18.0262C13.4703 18.8391 12.814 19.5 11.9984 19.5Z",
    fill: "#DFAE00"
  }
)), /* @__PURE__ */ (0, import_preact22.h)("defs", null, /* @__PURE__ */ (0, import_preact22.h)("clipPath", { id: "clip0_10650_34968" }, /* @__PURE__ */ (0, import_preact22.h)("rect", { width: "24", height: "24", fill: "white" }))));
var warning_default = WarningIcon;

// src/features/stored-card/stored-card-component.tsx
function StoredCardComponent({
  configuration,
  paymentMethods,
  storedPaymentMethod,
  onStoredCardRemoved
}) {
  const storedCardElementRef = (0, import_hooks7.useRef)(null);
  const adyenCardRef = (0, import_hooks7.useRef)();
  const customCardRef = (0, import_hooks7.useRef)();
  const [payButtonDisabled, setPayButtonDisabled] = (0, import_hooks7.useState)(true);
  const [securityCodePolicy, setSecurityCodePolicy] = (0, import_hooks7.useState)("required");
  const [askConfirmRemoveStoredCard, setAskConfirmRemoveStoredCard] = (0, import_hooks7.useState)(false);
  const [formErrors, setFormErrors] = (0, import_hooks7.useState)({
    encryptedSecurityCode: { visible: false }
  });
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    activeStoredPaymentMethodId,
    setActiveStoredPaymentMethodId,
    isStoredCardInitialized,
    updateStoredCardInitialization,
    threeDSecureRef,
    handleSuccess,
    handleError,
    setThreeDSecureActive
  } = usePaymentMethodGroup();
  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await (0, import_adyen_web4.AdyenCheckout)({
      clientKey: paymentMethods.clientKey,
      locale: configuration.locale,
      environment: configuration.environment,
      countryCode: "IS",
      paymentMethodsResponse: paymentMethods.paymentMethods,
      onError: handleOnError,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed
    });
    customCardRef.current = new import_adyen_web4.CustomCard(adyenCardRef.current, {
      brands: [storedPaymentMethod.brand],
      onConfigSuccess() {
        updateStoredCardInitialization(storedPaymentMethod.id, true);
      },
      onBrand: (event) => {
        setSecurityCodePolicy(event.cvcPolicy);
      },
      onValidationError: (event) => {
        const defaultErrors = {
          encryptedSecurityCode: { visible: false, message: void 0 }
        };
        event.filter((x) => x.error).forEach((x) => {
          defaultErrors[x.fieldType].visible = true;
          defaultErrors[x.fieldType].message = x.errorI18n;
        });
        setFormErrors(defaultErrors);
      },
      onAllValid: (event) => {
        setPayButtonDisabled(!event.allValid);
      },
      placeholders: configuration.placeholders,
      challengeWindowSize: "05"
      // looks like not working
    });
    if (storedCardElementRef.current) {
      customCardRef.current.mount(storedCardElementRef.current);
    }
  };
  (0, import_hooks7.useEffect)(() => {
    if (activePaymentMethod === "storedcard" && activeStoredPaymentMethodId === storedPaymentMethod.id && !isStoredCardInitialized[activeStoredPaymentMethodId]) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod, activeStoredPaymentMethodId]);
  (0, import_hooks7.useEffect)(() => {
    if (customCardRef.current && isStoredCardInitialized[activeStoredPaymentMethodId]) {
      initializeAdyenComponent();
      setFormErrors({ encryptedSecurityCode: { visible: false, message: void 0 } });
    }
  }, [configuration]);
  (0, import_hooks7.useEffect)(() => {
    setAskConfirmRemoveStoredCard(false);
  }, [activePaymentMethod, activeStoredPaymentMethodId]);
  function handleBoxChange() {
    setActivePaymentMethod("storedcard");
    setActiveStoredPaymentMethodId(storedPaymentMethod.id);
  }
  function handleAskToConfirmRemoveCard() {
    setAskConfirmRemoveStoredCard(true);
  }
  function handleCancelRemoveStoredCard() {
    setAskConfirmRemoveStoredCard(false);
  }
  async function handleConfirmRemoveStoredCard() {
    const data = {
      storedPaymentMethodId: storedPaymentMethod.id,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await postDisableTokenRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      handleError("error.failedToSubmitRemoveStoredPaymentCard");
      return;
    }
    const disableTokenResponse = await fetchResponse.json();
    if (!disableTokenResponse.success) {
      handleError("error.failedToRemoveStoredPaymentCard");
      return;
    }
    onStoredCardRemoved(storedPaymentMethod.id);
  }
  function handleOnError(_, __) {
    handleError("error.unknownError");
  }
  async function handleOnSubmit(state, _, actions) {
    const data = {
      ...state.data,
      origin: window.location.origin,
      sessionId: configuration.sessionId,
      paymentMethod: {
        ...state.data.paymentMethod,
        storedPaymentMethodId: storedPaymentMethod.id
      }
    };
    const fetchResponse = await createPaymentRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }
    const { resultCode, action } = response;
    if (resultCode === "RedirectShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
      adyenCardRef.current.createFromAction(action).mount(threeDSecureRef?.current);
      return;
    }
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  async function handleOnSubmitAdditionalData(state, _, actions) {
    const data = {
      ...state.data,
      sessionId: configuration.sessionId
    };
    const fetchResponse = await createDetailsRequest(configuration.environment, data);
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }
    const response = await fetchResponse.json();
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }
    const { resultCode, action } = response;
    actions.resolve({ resultCode, action });
    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }
  function handleSubmitClick() {
    if (!customCardRef.current) return;
    customCardRef.current.submit();
  }
  return /* @__PURE__ */ (0, import_preact23.h)("label", { className: "straumur__stored-card-component" }, /* @__PURE__ */ (0, import_preact23.h)(
    "input",
    {
      type: "radio",
      className: "straumur__stored-card-component__radio-selector",
      checked: activePaymentMethod === "storedcard" && activeStoredPaymentMethodId === storedPaymentMethod.id,
      onChange: handleBoxChange
    }
  ), /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component__content" }, /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component--circle" }), /* @__PURE__ */ (0, import_preact23.h)(
    RenderBrandIcons,
    {
      brands: [
        {
          brand: storedPaymentMethod.brand,
          brandFullName: storedPaymentMethod.name
        }
      ]
    }
  ), /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component--text" }, "\u2022\u2022\u2022\u2022 ", storedPaymentMethod.lastFour), activePaymentMethod === "storedcard" && activeStoredPaymentMethodId === storedPaymentMethod.id && isStoredCardInitialized[storedPaymentMethod.id] && /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__remove-stored-card-button" }, /* @__PURE__ */ (0, import_preact23.h)(
    "button",
    {
      onClick: handleAskToConfirmRemoveCard,
      className: "straumur__stored-card-component__remove-stored-card-button--text",
      disabled: askConfirmRemoveStoredCard
    },
    i18n(configuration.locale, "stored-cards.removeStoredCard")
  ))), /* @__PURE__ */ (0, import_preact23.h)(
    "div",
    {
      className: `${"straumur__stored-card-component__confirm-remove-stored-card"} ${askConfirmRemoveStoredCard ? "straumur__stored-card-component__confirm-remove-stored-card--expanded" : ""}`
    },
    /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__confirm-remove-stored-card--header" }, /* @__PURE__ */ (0, import_preact23.h)(warning_default, null), /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component__confirm-remove-stored-card--header--title" }, i18n(configuration.locale, "stored-cards.removeStoredCardQuestion"))),
    /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__confirm-remove-stored-card--actions" }, /* @__PURE__ */ (0, import_preact23.h)(
      "button",
      {
        className: "straumur__stored-card-component__confirm-remove-stored-card--actions--button",
        onClick: handleConfirmRemoveStoredCard
      },
      i18n(configuration.locale, "stored-cards.removeStoredCardQuestionYesRemove")
    ), /* @__PURE__ */ (0, import_preact23.h)(
      "button",
      {
        className: "straumur__stored-card-component__confirm-remove-stored-card--actions--button",
        onClick: handleCancelRemoveStoredCard
      },
      i18n(configuration.locale, "stored-cards.removeStoredCardQuestionCancel")
    ))
  ), /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__expandable", ref: storedCardElementRef }, !isStoredCardInitialized[storedPaymentMethod.id] && /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__loading-text" }, /* @__PURE__ */ (0, import_preact23.h)(loader_default, null)), /* @__PURE__ */ (0, import_preact23.h)(
    "div",
    {
      className: "straumur__stored-card-component__form",
      style: {
        opacity: isStoredCardInitialized[storedPaymentMethod.id] ? 1 : 0,
        position: isStoredCardInitialized[storedPaymentMethod.id] ? "relative" : "absolute",
        transition: "opacity 0.3s ease-in-out"
      }
    },
    /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__form--field-wrapper" }, /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__form--wrapper" }, /* @__PURE__ */ (0, import_preact23.h)("label", { className: "straumur__stored-card-component__form--wrapper--label straumur__stored-card-component__form--wrapper--label--readonly" }, i18n(configuration.locale, "stored-cards.expiryDate")), /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component__form--wrapper--input straumur__stored-card-component__form--wrapper--input--readonly" }, storedPaymentMethod.expiryMonth, "/", storedPaymentMethod.expiryYear)), /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__form--wrapper" }, (securityCodePolicy === "optional" || securityCodePolicy === "required") && /* @__PURE__ */ (0, import_preact23.h)(import_preact23.Fragment, null, /* @__PURE__ */ (0, import_preact23.h)(
      "label",
      {
        className: `${"straumur__stored-card-component__form--wrapper--label"} ${formErrors.encryptedSecurityCode.visible ? "straumur__stored-card-component__form--wrapper--label--error" : ""}`
      },
      securityCodePolicy === "optional" ? i18n(configuration.locale, "stored-cards.securityCode3DigitsOptional") : i18n(configuration.locale, "stored-cards.securityCode3Digits")
    ), /* @__PURE__ */ (0, import_preact23.h)(
      "span",
      {
        className: `${"straumur__stored-card-component__form--wrapper--input"} ${formErrors.encryptedSecurityCode.visible ? "straumur__stored-card-component__form--wrapper--input--error" : ""}`,
        "data-cse": "encryptedSecurityCode"
      },
      /* @__PURE__ */ (0, import_preact23.h)("div", { className: "straumur__stored-card-component__form--wrapper--label--info" }, /* @__PURE__ */ (0, import_preact23.h)(Tooltip, { content: i18n(configuration.locale, "stored-cards.securityCode3DigitsInfo") }, /* @__PURE__ */ (0, import_preact23.h)(info_default, null)))
    )), formErrors.encryptedSecurityCode.visible && /* @__PURE__ */ (0, import_preact23.h)("span", { className: "straumur__stored-card-component__form--wrapper--error" }, formErrors.encryptedSecurityCode.message))),
    /* @__PURE__ */ (0, import_preact23.h)(
      "button",
      {
        className: "straumur__stored-card-component__submit-button",
        disabled: payButtonDisabled,
        onClick: handleSubmitClick
      },
      paymentMethods.formattedAmount
    )
  )));
}
var stored_card_component_default = StoredCardComponent;

// src/features/stored-card/stored-card-container-component.tsx
var import_hooks8 = require("preact/hooks");
function StoredCardContainerComponent({
  configuration,
  paymentMethods
}) {
  const [storedPaymentMethods, setStoredPaymentMethods] = (0, import_hooks8.useState)(
    paymentMethods.paymentMethods.storedPaymentMethods ?? []
  );
  if (!storedPaymentMethods || storedPaymentMethods?.length === 0) {
    return null;
  }
  function handleStoredCardRemoved(storedPaymentMethodId) {
    setStoredPaymentMethods(
      (prevStoredPaymentMethods) => prevStoredPaymentMethods.filter((storedPaymentMethod) => storedPaymentMethod.id !== storedPaymentMethodId)
    );
  }
  return /* @__PURE__ */ (0, import_preact24.h)(import_preact24.Fragment, null, storedPaymentMethods?.map((storedPaymentMethod) => /* @__PURE__ */ (0, import_preact24.h)(
    stored_card_component_default,
    {
      key: storedPaymentMethod.id,
      configuration,
      storedPaymentMethod,
      paymentMethods,
      onStoredCardRemoved: handleStoredCardRemoved
    }
  )));
}
var stored_card_container_component_default = StoredCardContainerComponent;

// src/components/payment-method-group/payment-method-group.tsx
var import_preact25 = require("preact");

// src/components/payment-method-group/payment-method-group.css
styleInject(".straumur__payment-method-group {\n  display: flex;\n  flex-direction: column;\n  gap: var(--straumur__space-xxlg);\n  width: 100%;\n}\n");

// src/components/payment-method-group/payment-method-group.tsx
function PaymentMethodGroup({ children, initialValue }) {
  return /* @__PURE__ */ (0, import_preact25.h)(PaymentMethodGroupContext, { initialValue }, /* @__PURE__ */ (0, import_preact25.h)("div", { className: "straumur__payment-method-group" }, children));
}
var payment_method_group_default = PaymentMethodGroup;

// src/features/result-component/result-component.tsx
var import_preact28 = require("preact");

// src/features/result-component/result-component.css
styleInject(".straumur__result-component {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  height: 300px;\n  background-color: var(--straumur__color-white);\n  border-radius: 16px;\n}\n");

// src/assets/icons/success.tsx
var import_preact26 = require("preact");
var SuccessIcon = () => /* @__PURE__ */ (0, import_preact26.h)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "120", height: "120", viewBox: "0 0 120 120" }, /* @__PURE__ */ (0, import_preact26.h)(
  "circle",
  {
    cx: "60",
    cy: "60",
    r: "50",
    fill: "none",
    stroke: "#5b8206",
    "stroke-width": "5",
    "stroke-dasharray": "314",
    "stroke-dashoffset": "314"
  },
  /* @__PURE__ */ (0, import_preact26.h)("animate", { attributeName: "stroke-dashoffset", from: "314", to: "0", dur: "1s", fill: "freeze" })
), /* @__PURE__ */ (0, import_preact26.h)("g", { transform: "translate(60,60)" }, /* @__PURE__ */ (0, import_preact26.h)(
  "path",
  {
    d: "M-25 5 L-5 25 L25 -15",
    fill: "none",
    stroke: "#5b8206",
    "stroke-width": "6",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-dasharray": "100",
    "stroke-dashoffset": "100"
  },
  /* @__PURE__ */ (0, import_preact26.h)("animate", { attributeName: "stroke-dashoffset", from: "100", to: "0", dur: "0.5s", begin: "1s", fill: "freeze" }),
  /* @__PURE__ */ (0, import_preact26.h)(
    "animateTransform",
    {
      attributeName: "transform",
      type: "scale",
      from: "1 1",
      to: "1.2 1.2",
      begin: "1.5s",
      dur: "0.2s",
      fill: "freeze",
      additive: "sum"
    }
  ),
  /* @__PURE__ */ (0, import_preact26.h)(
    "animateTransform",
    {
      attributeName: "transform",
      type: "scale",
      from: "1.2 1.2",
      to: "1 1",
      begin: "1.7s",
      dur: "0.2s",
      fill: "freeze",
      additive: "sum"
    }
  )
)));
var success_default = SuccessIcon;

// src/assets/icons/failure.tsx
var import_preact27 = require("preact");
var FailureIcon = () => /* @__PURE__ */ (0, import_preact27.h)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "120", height: "120", viewBox: "0 0 120 120" }, /* @__PURE__ */ (0, import_preact27.h)(
  "circle",
  {
    cx: "60",
    cy: "60",
    r: "50",
    fill: "none",
    stroke: "#d03e00",
    "stroke-width": "5",
    "stroke-dasharray": "314",
    "stroke-dashoffset": "314"
  },
  /* @__PURE__ */ (0, import_preact27.h)("animate", { attributeName: "stroke-dashoffset", from: "314", to: "0", dur: "1s", fill: "freeze" })
), /* @__PURE__ */ (0, import_preact27.h)("g", { transform: "translate(60,60)" }, /* @__PURE__ */ (0, import_preact27.h)("g", { id: "crossGroup" }, /* @__PURE__ */ (0, import_preact27.h)(
  "line",
  {
    x1: "-20",
    y1: "-20",
    x2: "20",
    y2: "20",
    stroke: "#d03e00",
    "stroke-width": "6",
    "stroke-linecap": "round",
    "stroke-dasharray": "57",
    "stroke-dashoffset": "57"
  },
  /* @__PURE__ */ (0, import_preact27.h)("animate", { attributeName: "stroke-dashoffset", from: "57", to: "0", dur: "0.3s", begin: "1s", fill: "freeze" })
), /* @__PURE__ */ (0, import_preact27.h)(
  "line",
  {
    x1: "20",
    y1: "-20",
    x2: "-20",
    y2: "20",
    stroke: "#d03e00",
    "stroke-width": "6",
    "stroke-linecap": "round",
    "stroke-dasharray": "57",
    "stroke-dashoffset": "57"
  },
  /* @__PURE__ */ (0, import_preact27.h)("animate", { attributeName: "stroke-dashoffset", from: "57", to: "0", dur: "0.3s", begin: "1.3s", fill: "freeze" })
))));
var failure_default = FailureIcon;

// src/features/result-component/result-component.tsx
function ResultComponent({ configuration }) {
  const { error, success } = usePaymentMethodGroup();
  if (!error && !success) {
    return null;
  }
  return /* @__PURE__ */ (0, import_preact28.h)("div", { className: "straumur__result-component" }, error && /* @__PURE__ */ (0, import_preact28.h)(import_preact28.Fragment, null, /* @__PURE__ */ (0, import_preact28.h)(failure_default, null), /* @__PURE__ */ (0, import_preact28.h)("p", { className: "straumur__result-component__error--message" }, i18n(configuration.locale, error))), success && /* @__PURE__ */ (0, import_preact28.h)(import_preact28.Fragment, null, /* @__PURE__ */ (0, import_preact28.h)(success_default, null), /* @__PURE__ */ (0, import_preact28.h)("p", { className: "straumur__result-component__success--message" }, i18n(configuration.locale, success))));
}
var result_component_default = ResultComponent;

// src/features/three-d-secure-component/three-d-secure-component.tsx
var import_preact29 = require("preact");
var import_hooks9 = require("preact/hooks");

// src/features/three-d-secure-component/three-d-secure-component.css
styleInject(".straumur__three-d-secure {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  background-color: var(--straumur__color-white);\n  border-radius: var(--straumur__border-radius-xxlg);\n}\n");

// src/features/three-d-secure-component/three-d-secure-component.tsx
function StraumurCheckoutContainer() {
  const threeDSecureRef = (0, import_hooks9.useRef)(null);
  const { setThreeDSecureRef } = usePaymentMethodGroup();
  (0, import_hooks9.useEffect)(() => {
    if (threeDSecureRef.current) {
      setThreeDSecureRef(threeDSecureRef.current);
    }
  }, []);
  return /* @__PURE__ */ (0, import_preact29.h)("div", { className: "straumur__three-d-secure", ref: threeDSecureRef });
}
var three_d_secure_component_default = StraumurCheckoutContainer;

// src/features/payment-methods-wrapper/payment-methods-wrapper.tsx
var import_preact30 = require("preact");
function PaymentMethodsWrapper({ children }) {
  const { error, success, threeDSecureActive } = usePaymentMethodGroup();
  if (error || success || threeDSecureActive) {
    return null;
  }
  return /* @__PURE__ */ (0, import_preact30.h)(import_preact30.Fragment, null, children);
}
var payment_methods_wrapper_default = PaymentMethodsWrapper;

// src/features/straumur-checkout-container.tsx
function StraumurCheckoutContainer2({ configuration, paymentMethods }) {
  return /* @__PURE__ */ (0, import_preact31.h)(payment_method_group_default, { initialValue: null }, /* @__PURE__ */ (0, import_preact31.h)(payment_methods_wrapper_default, null, /* @__PURE__ */ (0, import_preact31.h)(stored_card_container_component_default, { configuration, paymentMethods }), /* @__PURE__ */ (0, import_preact31.h)(card_component_default, { configuration, paymentMethods }), /* @__PURE__ */ (0, import_preact31.h)(google_pay_component_default, { configuration, paymentMethods }), /* @__PURE__ */ (0, import_preact31.h)(apple_pay_component_default, { configuration, paymentMethods })), /* @__PURE__ */ (0, import_preact31.h)(three_d_secure_component_default, null), /* @__PURE__ */ (0, import_preact31.h)(result_component_default, { configuration }));
}
var straumur_checkout_container_default = StraumurCheckoutContainer2;

// src/straumur-checkout.tsx
var StraumurCheckout = class {
  configuration;
  paymentMethods = null;
  mountElement = null;
  constructor(config) {
    this.configuration = { ...config, locale: config.locale || "en-US" };
  }
  async mount(selector) {
    try {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!this.mountElement) {
        this.handleError("error.failedToInitializeStraumurWebComponent");
        return;
      }
      (0, import_preact32.render)(
        /* @__PURE__ */ (0, import_preact32.h)(RootComponent, null, /* @__PURE__ */ (0, import_preact32.h)("div", { className: "straumur__component" }, /* @__PURE__ */ (0, import_preact32.h)(loader_default, null))),
        this.mountElement
      );
      const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId);
      if (response.resultCode === "Error") {
        this.handleError(response.error);
        return;
      }
      this.paymentMethods = response;
      this.configuration.locale = this.configuration.locale || this.paymentMethods.locale;
      this.renderComponent();
    } catch (error) {
    }
  }
  renderComponent() {
    if (!this.mountElement) return;
    (0, import_preact32.render)(
      /* @__PURE__ */ (0, import_preact32.h)(RootComponent, null, /* @__PURE__ */ (0, import_preact32.h)(straumur_checkout_container_default, { configuration: this.configuration, paymentMethods: this.paymentMethods })),
      this.mountElement
    );
  }
  updateConfig(newConfig) {
    this.configuration = {
      ...this.configuration,
      ...newConfig
    };
    if (this.mountElement) {
      this.renderComponent();
    }
  }
  setLanguage(locale) {
    this.updateConfig({
      locale
    });
  }
  destroy() {
    if (this.mountElement) {
      (0, import_preact32.render)(null, this.mountElement);
      this.mountElement = null;
    }
  }
  handleError(message) {
    (0, import_preact32.render)(
      /* @__PURE__ */ (0, import_preact32.h)(RootComponent, null, /* @__PURE__ */ (0, import_preact32.h)("div", { className: "straumur__component" }, /* @__PURE__ */ (0, import_preact32.h)(failure_default, null), /* @__PURE__ */ (0, import_preact32.h)("p", null, i18n(this.configuration.locale, message)))),
      this.mountElement
    );
  }
};
var straumur_checkout_default = StraumurCheckout;
function RootComponent({ children }) {
  return /* @__PURE__ */ (0, import_preact32.h)("div", { className: "straumur__root-component" }, children);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StraumurCheckout
});
