import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import "./apple-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import {
  AdditionalDetailsActions,
  AdditionalDetailsData,
  AdyenCheckout,
  AdyenCheckoutError,
  ApplePay,
  ApplePayConfiguration,
  ICore,
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import i18n from "../../localizations/i18n";
import ApplePayIcon from "../../assets/icons/applepay";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";
import { CANCEL } from "../../models/constants";

interface ApplePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function ApplePayComponent({ configuration, paymentMethods }: ApplePayComponentProps): h.JSX.Element | null {
  const applePayElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const applePayRef = useRef<ApplePay>();
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
      environment: configuration.environment,
      locale: paymentMethods.locale,
      countryCode: "IS",
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onError: handleOnError,
      onPaymentCompleted: configuration.onPaymentCompleted,
      onPaymentFailed: configuration.onPaymentFailed,
    });

    const apayConfig = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "applepay")!
      .configuration! as { gatewayMerchantId: string; merchantId: string };

    const applePayConfiguration: ApplePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },

      environment: configuration.environment,
      configuration: {
        ...apayConfig,
        merchantName: paymentMethods.merchantName,
      },
      onSubmit: handleOnSubmit,
    };

    applePayRef.current = new ApplePay(adyenCardRef.current, applePayConfiguration);

    applePayRef.current
      .isAvailable()
      .then(() => {
        applePayRef.current!.mount(applePayElementRef.current!);
        updatePaymentMethodInitialization("applepay", true);
      })
      .catch(() => {
        handleError("error.applePayNotAvailable");
      });
  };

  useEffect(() => {
    if (activePaymentMethod === "applepay" && !isPaymentMethodInitialized.applepay) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);

  useEffect(() => {
    if (applePayRef.current && isPaymentMethodInitialized.applepay) {
      // Most of the time we will change configuration only to update locale, and that's not possible through .update() -> https://github.com/Adyen/adyen-web/issues/2407
      // So we need to reinitialize the component.
      initializeAdyenComponent();
    }
  }, [configuration]);

  const handleBoxChange = () => {
    setActivePaymentMethod("applepay");
  };

  function handleOnError(data: AdyenCheckoutError, _?: UIElement<UIElementProps> | undefined): void {
    if (data.name !== CANCEL) {
      handleError("error.unknownError");
    }
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

      adyenCardRef.current!.createFromAction(action).mount(threeDSecureRef?.current!);

      // @ts-ignore
      actions.resolve({});
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

    // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
    // You must call this, even if the result of the payment is unsuccessful.
    actions.resolve({ resultCode, action });

    if (resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
  }

  const hasApplePay = paymentMethods.paymentMethods!.paymentMethods?.some((x) => x.type === "applepay");

  if (!hasApplePay) {
    return null;
  }

  return (
    <label className="straumur__apple-pay-component">
      <input
        type="radio"
        className="straumur__apple-pay-component__radio-selector"
        checked={activePaymentMethod === "applepay"}
        onChange={handleBoxChange}
      />
      <span className="straumur__apple-pay-component__content">
        <span className="straumur__apple-pay-component--circle"></span>
        <ApplePayIcon />
        <span className="straumur__apple-pay-component--text">{i18n(configuration.locale, "applePay.title")}</span>
      </span>
      <div className="straumur__apple-pay-component__expandable">
        <div ref={applePayElementRef}></div>
      </div>
    </label>
  );
}

export default ApplePayComponent;
