import { Fragment, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import {
  AdyenCheckout,
  AdyenCheckoutError,
  ApplePay,
  ApplePayConfiguration,
  GooglePay,
  GooglePayConfiguration,
  ICore,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
import { ResolvedTheme, StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { CANCEL } from "../../models/constants";
import LoaderIcon from "../../assets/icons/loader";
import { AdyenPaymentHandlers, createAdyenPaymentHandlers } from "./create-adyen-handlers";
import { createBeforeSubmitClickHandler } from "./before-submit-click";
import { useAdyenLocaleReinit } from "../../utils/custom-hooks/use-adyen-locale-reinit";
import { useResolvedTheme } from "../../utils/custom-hooks/use-resolved-theme";
import { resolveApplePayButtonColor, resolveGooglePayButtonColor } from "../../utils/wallet-button-theme";

export type WalletMethod = "applepay" | "googlepay";

export interface WalletButtonProps {
  method: WalletMethod;
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  isInstantPayment: boolean;
  onUnavailable?: () => void;
}

type WalletElement = ApplePay | GooglePay;

/** Merchant identifiers Adyen requires inside the wallet element's configuration. */
type WalletMerchantConfig = { gatewayMerchantId: string; merchantId: string };

interface WalletContext {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  walletConfig: WalletMerchantConfig;
  handleOnSubmit: AdyenPaymentHandlers["handleOnSubmit"];
  resolvedTheme: ResolvedTheme;
}

interface WalletDescriptor {
  loadingClassName: string;
  createElement(core: ICore, context: WalletContext): WalletElement;
}

// Everything the two wallets share lives in WalletButton below; per-wallet differences
// (the Adyen element class and its configuration deltas) live in this descriptor map.
const WALLETS: Record<WalletMethod, WalletDescriptor> = {
  applepay: {
    loadingClassName: "straumur__apple-pay-button__loading",
    createElement(core, { configuration, paymentMethods, walletConfig, handleOnSubmit, resolvedTheme }) {
      const applePayConfiguration: ApplePayConfiguration = {
        amount: {
          value: paymentMethods.minorUnitsAmount,
          currency: paymentMethods.currency,
        },
        environment: configuration.environment,
        onSubmit: handleOnSubmit,
        onClick: createBeforeSubmitClickHandler(configuration.paymentFlow),
        // Follows the widget theme (light → white-outline, dark → black); overridable via applePayButtonTheme.
        buttonColor: resolveApplePayButtonColor(resolvedTheme, configuration.applePayButtonTheme),
        configuration: {
          ...walletConfig,
          merchantName: paymentMethods.merchantName,
        },
      };

      return new ApplePay(core, applePayConfiguration);
    },
  },
  googlepay: {
    loadingClassName: "straumur__google-pay-button__loading",
    createElement(core, { configuration, paymentMethods, walletConfig, handleOnSubmit, resolvedTheme }) {
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
        // Follows the widget theme (light → white, dark → black); overridable via googlePayButtonTheme.
        buttonColor: resolveGooglePayButtonColor(resolvedTheme, configuration.googlePayButtonTheme),
        buttonSizeMode: "fill",
        // px — Adyen draws the Google Pay button, so its radius can't come from CSS. Keep this in
        // sync with --straumur__border-radius-lg (12px), matching the payment-method "card box"
        // and the Apple Pay button (--apple-pay-button-border-radius), since the express wallet
        // buttons sit as tiles alongside that box.
        buttonRadius: 12,
        configuration: {
          ...walletConfig,
          merchantName: paymentMethods.merchantName,
        },
      };

      return new GooglePay(core, googlePayConfiguration);
    },
  },
};

function WalletButton({
  method,
  configuration,
  paymentMethods,
  isInstantPayment,
  onUnavailable,
}: WalletButtonProps): h.JSX.Element | null {
  const wallet = WALLETS[method];
  const resolvedTheme = useResolvedTheme(configuration.theme);
  const walletElementRef = useRef<HTMLDivElement>(null);
  const adyenCheckoutRef = useRef<ICore>();
  const walletRef = useRef<WalletElement>();
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
          setActivePaymentMethod(method);
        }
      },
    });

  function handleOnError(data: AdyenCheckoutError, _?: UIElement<UIElementProps> | undefined): void {
    if (data.name !== CANCEL) {
      handleError({ key: "error.unknownError" });
    }
  }

  function markUnavailable(): void {
    // Initialized-but-unavailable: the loader must disappear and the method must not stay selected.
    updatePaymentMethodInitialization(method, true);
    if (activePaymentMethod === method) {
      setActivePaymentMethod(null);
    }
    onUnavailable?.();
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

    const walletPaymentMethod = paymentMethods.paymentMethods.paymentMethods?.find((x) => x.type === method);
    const walletConfig = walletPaymentMethod?.configuration as WalletMerchantConfig | undefined;

    if (!walletConfig) {
      // No usable wallet configuration in the response: treat it like an unavailable wallet instead of crashing.
      markUnavailable();
      return;
    }

    walletRef.current = wallet.createElement(adyenCheckoutRef.current, {
      configuration,
      paymentMethods,
      walletConfig,
      handleOnSubmit,
      resolvedTheme,
    });

    walletRef.current
      .isAvailable()
      .then(() => {
        walletRef.current!.mount(walletElementRef.current!);
        updatePaymentMethodInitialization(method, true);
      })
      .catch(() => {
        markUnavailable();
      });
  };

  useEffect(() => {
    if (!isPaymentMethodInitialized[method]) {
      initializeAdyenComponent();
    }
  }, [configuration]);

  useAdyenLocaleReinit(
    configuration,
    () => Boolean(walletRef.current && isPaymentMethodInitialized[method]),
    () => {
      walletRef.current!.remove();
      initializeAdyenComponent();
    }
  );

  if (isObscuredByThreeDS(method)) {
    return null;
  }

  return (
    <Fragment>
      {isPaymentMethodInitialized[method] === false && (
        <div className={wallet.loadingClassName}>
          <LoaderIcon />
        </div>
      )}
      <div
        ref={walletElementRef}
        style={{
          height: threeDSecureActive ? "600px" : "auto",
          minWidth: threeDSecureActive ? "350px" : "auto",
          position: isPaymentMethodInitialized[method] ? "static" : "absolute",
        }}
      />
    </Fragment>
  );
}

export default WalletButton;
