import "./google-pay-button.css";
import { Fragment, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import {
  AdyenCheckout,
  AdyenCheckoutError,
  GooglePay,
  GooglePayConfiguration,
  ICore,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { CANCEL } from "../../models/constants";
import LoaderIcon from "../../assets/icons/loader";
import { createAdyenPaymentHandlers } from "../shared/create-adyen-handlers";
import { createBeforeSubmitClickHandler } from "../shared/before-submit-click";
import { useAdyenLocaleReinit } from "../../utils/custom-hooks/use-adyen-locale-reinit";

interface GooglePayButtonProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  isInstantPayment: boolean;
  onUnavailable?: () => void;
}

function GooglePayButton({
  configuration,
  paymentMethods,
  isInstantPayment,
  onUnavailable,
}: GooglePayButtonProps): h.JSX.Element | null {
  const googlePayElementRef = useRef<HTMLDivElement>(null);
  const adyenCheckoutRef = useRef<ICore>();
  const googlePayRef = useRef<GooglePay>();
  const {
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
    isObscuredByThreeDS,
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
          setActivePaymentMethod("googlepay");
        }
      },
    });

  function handleOnError(data: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined): void {
    if (data.name !== CANCEL) {
      handleError({ key: "error.unknownError" });
    }
  }

  const initializeAdyenComponent = async () => {
    adyenCheckoutRef.current = await AdyenCheckout({
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

    const gpayPaymentMethods = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "googlepay")!;
    const gpayConfig = gpayPaymentMethods.configuration! as { gatewayMerchantId: string; merchantId: string };

    const googlePayConfiguration: GooglePayConfiguration = {
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      challengeWindowSize: "05",
      countryCode: configuration.countryCode,
      environment: configuration.environment,
      onSubmit: handleOnSubmit,
      onClick: createBeforeSubmitClickHandler(configuration.paymentFlow),
      buttonSizeMode: "fill",
      configuration: {
        ...gpayConfig,
        merchantName: paymentMethods.merchantName,
      },
    };

    googlePayRef.current = new GooglePay(adyenCheckoutRef.current, googlePayConfiguration);

    googlePayRef.current
      .isAvailable()
      .then(() => {
        googlePayRef.current!.mount(googlePayElementRef.current!);
        updatePaymentMethodInitialization("googlepay", true);
      })
      .catch(() => {
        updatePaymentMethodInitialization("googlepay", true);
        if (activePaymentMethod === "googlepay") {
          setActivePaymentMethod(null);
        }
        onUnavailable?.();
      });
  };

  useEffect(() => {
    if (!isPaymentMethodInitialized.googlepay) {
      initializeAdyenComponent();
    }
  }, [configuration]);

  useAdyenLocaleReinit(
    configuration,
    () => Boolean(googlePayRef.current && isPaymentMethodInitialized.googlepay),
    () => {
      googlePayRef.current!.remove();
      initializeAdyenComponent();
    }
  );

  if (isObscuredByThreeDS("googlepay")) {
    return null;
  }

  return (
    <Fragment>
      {isPaymentMethodInitialized.googlepay === false && (
        <div className="straumur__google-pay-button__loading">
          <LoaderIcon />
        </div>
      )}
      <div
        ref={googlePayElementRef}
        style={{
          height: threeDSecureActive ? "600px" : "auto",
          minWidth: threeDSecureActive ? "350px" : "auto",
          position: isPaymentMethodInitialized.googlepay ? "static" : "absolute",
        }}
      />
    </Fragment>
  );
}

export default GooglePayButton;
