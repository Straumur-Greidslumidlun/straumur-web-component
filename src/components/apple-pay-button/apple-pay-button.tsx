import "./apple-pay-button.css";
import { Fragment, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
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
  PaymentCompletedData,
  PaymentFailedData,
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";
import { CANCEL } from "../../models/constants";
import "./apple-pay-button.css";
import LoaderIcon from "../../assets/icons/loader";

interface ApplePayButtonProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  showPaymentButton: boolean;
}

function ApplePayButton({
  configuration,
  paymentMethods,
  showPaymentButton,
}: ApplePayButtonProps): h.JSX.Element | null {
  const applePayElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const applePayRef = useRef<ApplePay>();
  const {
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
      paymentMethodsResponse: paymentMethods.paymentMethods,
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      onError: handleOnError,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    const apayPaymentMethods = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "applepay")!;
    const apayConfig = apayPaymentMethods.configuration! as { gatewayMerchantId: string; merchantId: string };

    const applePayConfiguration: ApplePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      environment: configuration.environment,
      onSubmit: handleOnSubmit,
      configuration: {
        ...apayConfig,
        merchantName: paymentMethods.merchantName,
      },
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
    if (showPaymentButton && !isPaymentMethodInitialized.applepay) {
      initializeAdyenComponent();
    }
  }, [configuration, showPaymentButton]);

  useEffect(() => {
    if (applePayRef.current && isPaymentMethodInitialized.applepay) {
      applePayRef.current!.remove();
      // Most of the time we will change configuration only to update locale, and that's not possible through .update() -> https://github.com/Adyen/adyen-web/issues/2407
      // So we need to reinitialize the component.
      initializeAdyenComponent();
    }
  }, [configuration]);

  function handleOnError(data: AdyenCheckoutError, _?: UIElement<UIElementProps> | undefined): void {
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

  const hasApplePay = paymentMethods.paymentMethods!.paymentMethods?.some((x) => x.type === "applepay");

  if (!hasApplePay) {
    return null;
  }

  if (!showPaymentButton && threeDSecureActive) {
    // if threeDSecureActive for some other payment method, do not show apple pay
    return null;
  }

  return (
    <Fragment>
      {isPaymentMethodInitialized.applepay === false && (
        <div className="straumur__apple-pay-button__loading">
          <LoaderIcon />
        </div>
      )}
      <div
        ref={applePayElementRef}
        style={{
          height: threeDSecureActive ? "600px" : "auto",
          minWidth: threeDSecureActive ? "350px" : "auto",
          position: isPaymentMethodInitialized.applepay ? "static" : "absolute",
        }}
      />
    </Fragment>
  );
}

export default ApplePayButton;
