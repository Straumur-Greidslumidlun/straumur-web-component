import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import "./google-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import {
  AdditionalDetailsActions,
  AdditionalDetailsData,
  AdyenCheckout,
  AdyenCheckoutError,
  GooglePay,
  GooglePayConfiguration,
  ICore,
  PaymentCompletedData,
  PaymentFailedData,
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { useI18n } from "../../localizations/i18n-context";
import GooglePayIcon from "../../assets/icons/googlepay";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";
import { CANCEL } from "../../models/constants";

interface GooglePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function GooglePayComponent({ configuration, paymentMethods }: GooglePayComponentProps): h.JSX.Element | null {
  const googlePayElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const googlePayRef = useRef<GooglePay>();
  const { i18n } = useI18n();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
  } = usePaymentMethodGroup();

  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      environment: configuration.environment,
      locale: paymentMethods.locale,
      countryCode: "IS",
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      onError: handleOnError,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    const gpayConfig = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "googlepay")!
      .configuration! as { gatewayMerchantId: string; merchantId: string };

    const googlePayConfiguration: GooglePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      challengeWindowSize: "05",
      countryCode: "IS",
      environment: configuration.environment,
      onSubmit: handleOnSubmit,
      configuration: {
        ...gpayConfig,
        merchantName: paymentMethods.merchantName,
      },
    };

    googlePayRef.current = new GooglePay(adyenCardRef.current, googlePayConfiguration);

    googlePayRef.current
      .isAvailable()
      .then(() => {
        googlePayRef.current!.mount(googlePayElementRef.current!);
        updatePaymentMethodInitialization("googlepay", true);
      })
      .catch(() => {
        handleError("error.googlePayNotAvailable");
      });
  };

  useEffect(() => {
    if (activePaymentMethod === "googlepay" && !isPaymentMethodInitialized.googlepay) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);

  useEffect(() => {
    if (googlePayRef.current && isPaymentMethodInitialized.googlepay) {
      // Most of the time we will change configuration only to update locale, and that's not possible through .update() -> https://github.com/Adyen/adyen-web/issues/2407
      // So we need to reinitialize the component.
      initializeAdyenComponent();
    }
  }, [configuration]);

  const handleBoxChange = () => {
    setActivePaymentMethod("googlepay");
  };

  function handleOnError(data: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined): void {
    if (data.name !== CANCEL) {
      handleError("error.unknownError");
    }
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    const data: ICreatePaymentBody = {
      ...state.data,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await createPaymentRequest(configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should never be empty.
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }

    const { resultCode, action } = response;

    if (resultCode === "ChallengeShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
    }

    // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
    // You must call this, even if the result of the payment is unsuccessful.
    actions.resolve({ resultCode, action });
  }

  async function handleOnSubmitAdditionalData(
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) {
    const data: ICreateDetailsBody = {
      ...state.data,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await createDetailsRequest(configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should always be either Authorised or Refused or IdentifyShopper. Never empty.
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }

    const { resultCode, action } = response;

    // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
    // You must call this, even if the result of the payment is unsuccessful.
    actions.resolve({ resultCode, action });
  }

  function handlePaymentCompleted(data: PaymentCompletedData, _?: UIElement<UIElementProps> | undefined): void {
    if (data.resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
    configuration.onPaymentCompleted?.({ resultCode: data.resultCode });
  }

  function handlePaymentFailed(data?: PaymentFailedData | undefined, _?: UIElement<UIElementProps> | undefined): void {
    if (data) {
      if (data.resultCode === "Authorised") {
        handleSuccess("success.paymentAuthorized");
      } else {
        handleError("error.paymentUnsuccessful");
      }

      configuration.onPaymentFailed?.({ resultCode: data.resultCode });
    } else {
      configuration.onPaymentFailed?.();
    }
  }

  const hasGooglePay = paymentMethods.paymentMethods!.paymentMethods?.some((x) => x.type === "googlepay");

  if (!hasGooglePay) {
    return null;
  }

  if (activePaymentMethod !== "googlepay" && threeDSecureActive) {
    // if threeDSecureActive for some other payment method, do not show google pay
    return null;
  }

  return (
    <label className="straumur__google-pay-component">
      <input
        type="radio"
        className="straumur__google-pay-component__radio-selector"
        checked={activePaymentMethod === "googlepay"}
        onChange={handleBoxChange}
      />
      <span className="straumur__google-pay-component__content">
        <span className="straumur__google-pay-component--circle"></span>
        <GooglePayIcon />
        <span className="straumur__google-pay-component--text">{i18n.t("googlePay.title")}</span>
      </span>
      <div className="straumur__google-pay-component__expandable">
        <div
          ref={googlePayElementRef}
          style={{
            height: threeDSecureActive ? "600px" : "auto",
            minWidth: threeDSecureActive ? "350px" : "auto",
          }}
        ></div>
      </div>
    </label>
  );
}

export default GooglePayComponent;
