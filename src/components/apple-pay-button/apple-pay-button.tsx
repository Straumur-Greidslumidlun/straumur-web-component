import "./apple-pay-button.css";
import { Fragment, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import {
  AdyenCheckout,
  AdyenCheckoutError,
  ApplePay,
  ApplePayConfiguration,
  ICore,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { CANCEL } from "../../models/constants";
import "./apple-pay-button.css";
import LoaderIcon from "../../assets/icons/loader";
import { createAdyenPaymentHandlers } from "../shared/create-adyen-handlers";
import { createBeforeSubmitClickHandler } from "../shared/before-submit-click";

interface ApplePayButtonProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  isInstantPayment: boolean;
  onUnavailable?: () => void;
}

function ApplePayButton({
  configuration,
  paymentMethods,
  isInstantPayment,
  onUnavailable,
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
    setActivePaymentMethod,
    activePaymentMethod,
  } = usePaymentMethodGroup();

  const { handleOnSubmit, handleOnSubmitAdditionalData, handlePaymentCompleted, handlePaymentFailed } =
    createAdyenPaymentHandlers({
      configuration,
      handleSuccess,
      handleError,
      setThreeDSecureActive,
      onSubmitStart: () => {
        if (isInstantPayment) {
          setActivePaymentMethod("applepay");
        }
      },
    });

  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      environment: configuration.environment,
      locale: configuration.locale,
      countryCode: configuration.countryCode,
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
      onClick: createBeforeSubmitClickHandler(configuration.paymentFlow),
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
        updatePaymentMethodInitialization("applepay", true);
        if (activePaymentMethod === "applepay") {
          setActivePaymentMethod(null);
        }
        onUnavailable?.();
      });
  };

  useEffect(() => {
    if (!isPaymentMethodInitialized.applepay) {
      initializeAdyenComponent();
    }
  }, [configuration]);

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
      handleError({ key: "error.unknownError" });
    }
  }

  if (activePaymentMethod !== "applepay" && threeDSecureActive) {
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
