import { h, render } from "preact";
import "./styles/main.css";
import {
  ResultMessage,
  StraumurCheckoutConfiguration,
  StraumurCheckoutUpdateOptions,
  StraumurWebAdvancedConfiguration,
  StraumurWebConfiguration,
} from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { normalizeLocale, PublicLocale } from "./localizations/locale";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { PaymentMethodsResponse, SuccessResponse } from "./services/models";
import { AdyenCheckout } from "@adyen/adyen-web";
import { I18nProvider } from "./localizations/i18n-context";
import { I18nService } from "./localizations/i18n-service";
import { SubmitApi } from "./components/payment-method-group/payment-method-group-context";
import { createAdyenPaymentHandlers } from "./components/shared/create-adyen-handlers";
import { LoaderScreen, RootComponent, StatusScreen } from "./components/shared/status-screen";
import { buildCheckoutConfiguration } from "./config/build-checkout-configuration";

class StraumurCheckout {
  private configuration: StraumurCheckoutConfiguration;
  private advancedConfiguration: StraumurWebAdvancedConfiguration | null = null;
  private paymentMethods: SuccessResponse | null = null;
  private mountElement: HTMLElement | null = null;
  private i18n: I18nService;
  private submitApi: SubmitApi | null = null;
  private initializationFailed = false;

  // Public signature accepts the session configuration only. The advanced-mode configuration
  // (internal, used by Straumur Hosted Checkout via the IIFE bundle) is detected at runtime.
  constructor(publicConfig: StraumurWebConfiguration) {
    const initialization = buildCheckoutConfiguration(publicConfig);

    this.configuration = initialization.configuration;
    this.advancedConfiguration = initialization.advancedConfiguration;
    this.paymentMethods = initialization.paymentMethods;
    this.initializationFailed = initialization.initializationFailed;
    this.i18n = new I18nService(this.configuration.locale, this.configuration.customLocalizations);
  }

  async mount(selector: HTMLElement | string): Promise<void> {
    try {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;

      if (!this.mountElement) {
        return;
      }

      if (this.initializationFailed) {
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return;
      }

      if (this.configuration.mode === "advanced") {
        this.renderComponent();
        return;
      }

      render(<LoaderScreen theme={this.configuration.theme} />, this.mountElement);

      const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId!);

      if (response.resultCode === "Error") {
        this.handleError({ key: response.error });
        return;
      }

      this.paymentMethods = response;

      this.renderComponent();
    } catch (error) {
      // Never throw into the host page, but leave a trace for the merchant's console.
      console.error("[StraumurCheckout] mount() failed:", error);
    }
  }

  private renderComponent(): void {
    if (!this.mountElement) return;

    render(
      <RootComponent theme={this.configuration.theme}>
        <I18nProvider
          i18nService={this.i18n}
          onLanguageChange={(language) => {
            this.configuration.locale = language;
            this.renderComponent();
          }}
        >
          <StraumurCheckoutContainer
            configuration={this.configuration}
            paymentMethods={this.paymentMethods!}
            onSubmitApiReady={(api) => {
              this.submitApi = api;
            }}
          />
        </I18nProvider>
      </RootComponent>,
      this.mountElement
    );
  }

  handleSuccess(message: ResultMessage) {
    if (!this.mountElement) return;

    render(
      <StatusScreen variant="success" message={message} i18n={this.i18n} theme={this.configuration.theme} />,
      this.mountElement
    );
  }

  handleError(message: ResultMessage) {
    if (!this.mountElement) return;

    render(
      <StatusScreen variant="failure" message={message} i18n={this.i18n} theme={this.configuration.theme} />,
      this.mountElement
    );
  }

  // Resolves what the redirect-return Adyen bootstrap needs per mode, rendering the
  // failure screen and returning null when the context cannot be established.
  private async resolveRedirectContext(): Promise<{
    clientKey: string;
    paymentMethods: PaymentMethodsResponse;
  } | null> {
    if (this.configuration.mode === "advanced") {
      if (this.initializationFailed || !this.advancedConfiguration) {
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return null;
      }

      return {
        clientKey: this.advancedConfiguration.clientKey,
        paymentMethods: this.advancedConfiguration.paymentMethods,
      };
    }

    const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId!);

    if (response.resultCode === "Error") {
      this.handleError({ key: response.error });
      return null;
    }

    return { clientKey: response.clientKey, paymentMethods: response.paymentMethods };
  }

  // selector lets a page that never called mount() (e.g. a 3DS redirect return) show the result screens
  async submitDetails(redirectResult: string, selector?: HTMLElement | string) {
    try {
      if (selector) {
        this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
      }

      const redirectContext = await this.resolveRedirectContext();

      if (!redirectContext) {
        return;
      }

      const { handleOnSubmitAdditionalData } = createAdyenPaymentHandlers({
        configuration: this.configuration,
        handleSuccess: (message) => this.handleSuccess(message),
        handleError: (message) => this.handleError(message),
        setThreeDSecureActive: () => {},
        dispatchResultFromAdditionalDetails: true,
      });

      // Deliberately no core-level onPaymentCompleted/onPaymentFailed here: the handler above
      // dispatches the final result itself, and wiring both would double-fire the merchant callbacks.
      const checkout = await AdyenCheckout({
        environment: this.configuration.environment,
        clientKey: redirectContext.clientKey,
        paymentMethodsResponse: redirectContext.paymentMethods,
        countryCode: this.configuration.countryCode,
        onAdditionalDetails: handleOnSubmitAdditionalData,
      });

      checkout.submitDetails({
        details: {
          redirectResult,
        },
      });
    } catch (error) {
      // Same no-throw philosophy as mount(): render the failure in-place, log for the console.
      console.error("[StraumurCheckout] submitDetails() failed:", error);
      this.handleError({ key: "error.failedToSubmitPaymentDetails" });
      this.configuration.onPaymentFailed?.({ resultCode: "Error" });
    }
  }

  updateConfig(newConfig: StraumurCheckoutUpdateOptions): void {
    const { locale, ...rest } = newConfig;

    this.configuration = {
      ...this.configuration,
      ...rest,
      // The public vocabulary is short codes; normalizeLocale also tolerates legacy full tags at runtime.
      ...(locale ? { locale: normalizeLocale(locale) } : {}),
    };

    // Update i18n if locale or customLocalizations changed
    if (locale) {
      this.i18n.setLanguage(this.configuration.locale);
    }
    if (newConfig.customLocalizations) {
      this.i18n.updateCustomLocalizations(newConfig.customLocalizations);
    }

    // Re-render the component with new config
    if (this.mountElement) {
      this.renderComponent();
    }
  }

  setLanguage(locale: PublicLocale): void {
    this.updateConfig({
      locale: locale,
    });
  }

  destroy(): void {
    // Clean up resources
    if (this.mountElement) {
      render(null, this.mountElement);
      this.mountElement = null;
    }
    this.submitApi = null;
  }

  submitCard(): boolean {
    if (!this.mountElement) {
      console.warn("[StraumurCheckout] submitCard() called before the component was mounted.");
      return false;
    }

    if (!this.submitApi) {
      console.warn("[StraumurCheckout] submitCard() called but the component is not ready yet.");
      return false;
    }

    const triggered = this.submitApi.triggerSubmit();

    if (!triggered) {
      console.warn(
        "[StraumurCheckout] submitCard() called but no card-type payment method is currently active and initialized."
      );
    }

    return triggered;
  }
}

export default StraumurCheckout;
