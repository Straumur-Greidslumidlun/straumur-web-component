import { Fragment, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import {
  AdyenCheckout,
  ApplePay,
  ApplePayConfiguration,
  GooglePay,
  GooglePayConfiguration,
  ICore,
} from "@adyen/adyen-web";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
import { ResolvedTheme, StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import LoaderIcon from "../../assets/icons/loader";
import { AdyenPaymentHandlers, createAdyenErrorHandler, createAdyenPaymentHandlers } from "./create-adyen-handlers";
import { createBeforeSubmitClickHandler } from "./before-submit-click";
import { useAdyenLocaleReinit } from "../../utils/custom-hooks/use-adyen-locale-reinit";
import { useResolvedTheme } from "../../utils/custom-hooks/use-resolved-theme";
import { ProcessingOverlay } from "./processing-overlay";
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
  /** Synchronous lock read: the onClick gate refuses to open the sheet while a payment runs. */
  isPaymentLocked: () => boolean;
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
    createElement(
      core,
      { configuration, paymentMethods, walletConfig, handleOnSubmit, resolvedTheme, isPaymentLocked }
    ) {
      const applePayConfiguration: ApplePayConfiguration = {
        amount: {
          value: paymentMethods.minorUnitsAmount,
          currency: paymentMethods.currency,
        },
        environment: configuration.environment,
        onSubmit: handleOnSubmit,
        onClick: createBeforeSubmitClickHandler(configuration.paymentFlow, isPaymentLocked),
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
    createElement(
      core,
      { configuration, paymentMethods, walletConfig, handleOnSubmit, resolvedTheme, isPaymentLocked }
    ) {
      const googlePayConfiguration: GooglePayConfiguration = {
        amount: {
          value: paymentMethods.minorUnitsAmount,
          currency: paymentMethods.currency,
        },
        challengeWindowSize: "05",
        countryCode: configuration.countryCode,
        environment: configuration.environment,
        onSubmit: handleOnSubmit,
        onClick: createBeforeSubmitClickHandler(configuration.paymentFlow, isPaymentLocked),
        // Follows the widget theme (light → white, dark → black); overridable via googlePayButtonTheme.
        buttonColor: resolveGooglePayButtonColor(resolvedTheme, configuration.googlePayButtonTheme),
        // "plain" renders only the Google Pay mark (no "Pay"/"Buy with" text), matching the
        // Apple Pay button which sits beside it.
        buttonType: "plain",
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
  // See card-form: a superseded init discards itself so overlapping inits never mount two buttons.
  const initGenerationRef = useRef(0);
  const {
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
    paymentInProgress,
    setPaymentInProgress,
    isPaymentLocked,
    paymentProcessing,
    setPaymentProcessing,
    isObscuredByThreeDS,
    setActivePaymentMethod,
    activePaymentMethod,
  } = usePaymentMethodGroup();

  const {
    handleOnSubmit,
    handleOnSubmitAdditionalData,
    handlePaymentCompleted,
    handlePaymentFailed,
    handleActionHandled,
  } = createAdyenPaymentHandlers({
    configuration,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    setPaymentInProgress,
    setPaymentProcessing,
    onSubmitStart: () => {
      if (isInstantPayment) {
        setActivePaymentMethod(method);
      }
    },
  });

  const handleOnError = createAdyenErrorHandler(handleError, `${method}`);

  function markUnavailable(): void {
    // Initialized-but-unavailable: the loader must disappear and the method must not stay selected.
    updatePaymentMethodInitialization(method, true);
    if (activePaymentMethod === method) {
      setActivePaymentMethod(null);
    }
    onUnavailable?.();
  }

  const { markBuilt } = useAdyenLocaleReinit({
    configuration,
    resolvedTheme,
    ready: Boolean(walletRef.current && isPaymentMethodInitialized[method]),
    busy: paymentInProgress || threeDSecureActive,
    reinitialize: () => {
      initializeAdyenComponent();
    },
  });

  async function initializeAdyenComponent(): Promise<void> {
    const generation = ++initGenerationRef.current;
    markBuilt();

    try {
      await buildAdyenComponent(generation);
    } catch (error) {
      if (generation !== initGenerationRef.current) return;
      // A wallet that can't start is just unavailable — hide it, don't take down the whole checkout.
      console.error(`[StraumurCheckout] ${method} initialization failed:`, error);
      markUnavailable();
    }
  }

  async function buildAdyenComponent(generation: number): Promise<void> {
    const core = await AdyenCheckout({
      // This Adyen bootstrap only runs when a wallet method exists, which means Adyen methods are
      // present and the backend returned a clientKey.
      clientKey: paymentMethods.clientKey!,
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
      onActionHandled: handleActionHandled,
    });

    if (generation !== initGenerationRef.current) return;
    adyenCheckoutRef.current = core;

    const walletPaymentMethod = paymentMethods.paymentMethods.paymentMethods?.find((x) => x.type === method);
    const walletConfig = walletPaymentMethod?.configuration as WalletMerchantConfig | undefined;

    if (!walletConfig) {
      // No usable wallet configuration in the response: treat it like an unavailable wallet instead of crashing.
      markUnavailable();
      return;
    }

    // Tear down the previous button (re-init) right before building its replacement.
    walletRef.current?.remove();
    const element = wallet.createElement(core, {
      configuration,
      paymentMethods,
      walletConfig,
      handleOnSubmit,
      resolvedTheme,
      isPaymentLocked,
    });

    walletRef.current = element;

    try {
      await element.isAvailable();
    } catch {
      // isAvailable() rejecting is Adyen's normal "not available on this device/browser" signal.
      if (generation === initGenerationRef.current) markUnavailable();
      return;
    }

    if (generation !== initGenerationRef.current || !walletElementRef.current) return;
    element.mount(walletElementRef.current);
    updatePaymentMethodInitialization(method, true);
  }

  useEffect(() => {
    if (!isPaymentMethodInitialized[method]) {
      initializeAdyenComponent();
    }
  }, [configuration]);

  if (isObscuredByThreeDS(method)) {
    return null;
  }

  const showProcessing = paymentProcessing && activePaymentMethod === method;

  return (
    <Fragment>
      {isPaymentMethodInitialized[method] === false && (
        <div className={wallet.loadingClassName}>
          <LoaderIcon />
        </div>
      )}
      <div
        className="straumur__processing-host"
        style={{
          // While 3DS runs in this tile, reserve the challenge's footprint so the overlay is visible
          // during the fingerprint step too (its iframe is display:none, so the tile would collapse).
          minHeight: threeDSecureActive && showProcessing ? "400px" : undefined,
          width: threeDSecureActive ? "100%" : undefined,
        }}
      >
        <div
          ref={walletElementRef}
          style={{
            // Button tile: fixed 48px (matching the Apple Pay button height) so Google Pay and Apple
            // Pay render at the same height — an "auto" height let a shorter wallet leave a few px of
            // dead space below.
            // 3DS challenge: drop the fixed height/min-width and go full width so the Adyen challenge
            // iframe (min-height:400px, height:inherit) governs the size — identical to the card flow,
            // which mounts the same challenge into an auto-height, full-width container.
            height: threeDSecureActive ? undefined : "48px",
            width: threeDSecureActive ? "100%" : undefined,
            position: isPaymentMethodInitialized[method] ? "static" : "absolute",
            // Lock the Adyen-drawn wallet button while a payment is in flight (can't add `disabled` to
            // Adyen's element). Never while THIS wallet is showing a 3DS challenge in the same div —
            // that must stay interactive; other methods are hidden by 3DS anyway.
            pointerEvents: paymentInProgress && !threeDSecureActive ? "none" : undefined,
            opacity: paymentInProgress && !threeDSecureActive ? 0.5 : undefined,
          }}
        />
        {/* Compact over the 48px tile; full (with label) once 3DS has widened it to the challenge area. */}
        <ProcessingOverlay visible={showProcessing} compact={!threeDSecureActive} />
      </div>
    </Fragment>
  );
}

export default WalletButton;
