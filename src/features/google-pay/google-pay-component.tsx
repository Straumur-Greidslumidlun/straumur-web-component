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
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import i18n from "../../localizations/i18n";
import GooglePayIcon from "../../assets/icons/googlepay";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";

interface GooglePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function GooglePayComponent({ configuration, paymentMethods }: GooglePayComponentProps): h.JSX.Element | null {
  const googlePayElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<any>();
  const googlePayRef = useRef<GooglePay>();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    threeDSecureRef,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
  } = usePaymentMethodGroup();

  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      locale: paymentMethods.locale,
      environment: configuration.environment,
      countryCode: "IS",
      onError: handleOnError,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed,
    });

    const gpayConfig = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "googlepay")!
      .configuration! as { gatewayMerchantId: string; merchantId: string };

    const googlePayConfiguration: GooglePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },

      countryCode: "IS",
      environment: configuration.environment,
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
      .catch((e) => {
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

  function handleOnError(_: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined): void {
    handleError("error.unknownError");
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    const data: ICreatePaymentBody = {
      ...state.data,
      origin: window.location.origin,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await createPaymentRequest(configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      // const errorResponse = await fetchResponse.json();
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

    if (resultCode === "RedirectShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);

      adyenCardRef.current.createFromAction(action).mount(threeDSecureRef?.current!);
      return;
    }

    // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
    // You must call this, even if the result of the payment is unsuccessful.
    actions.resolve({ resultCode, action });

    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
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
      // const errorResponse = await fetchResponse.json();
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

    // If the /payments/details request from
    // You must call this, even if the result
    actions.resolve({ resultCode, action });

    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }

  const hasGooglePay = paymentMethods.paymentMethods!.paymentMethods?.some((x) => x.type === "googlepay");

  if (!hasGooglePay) {
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
        <span className="straumur__google-pay-component--text">{i18n(configuration.locale, "googlepay.title")}</span>
      </span>
      <div className="straumur__google-pay-component__expandable">
        <div ref={googlePayElementRef}></div>
      </div>
    </label>
  );
}

export default GooglePayComponent;
