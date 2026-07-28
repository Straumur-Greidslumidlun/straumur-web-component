import { h, render } from "preact";
import "./styles/main.css";
import {
  ResultMessage,
  StraumurCheckoutConfiguration,
  StraumurCheckoutUpdateOptions,
  StraumurWebConfiguration,
} from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { normalizeLocale, PublicLocale } from "./localizations/locale";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { SuccessResponse } from "./services/models";
import { I18nProvider } from "./localizations/i18n-context";
import { I18nService } from "./localizations/i18n-service";
import { SubmitApi } from "./components/payment-method-group/payment-method-group-context";
import { dispatchFinalResult } from "./components/shared/dispatch-final-result";
import { LoaderScreen, RootComponent, StatusScreen } from "./components/shared/status-screen";
import { buildCheckoutConfiguration } from "./config/build-checkout-configuration";

class StraumurCheckout {
  private configuration: StraumurCheckoutConfiguration;
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

  // Redirect return (both Adyen redirect-3DS and Kortalán): POST /additional-details directly through
  // the payment flow — no Adyen SDK, so it also works for a native-only terminal that has no clientKey.
  // The backend routes the continuation to the correct provider by paymentCheckoutReference. selector
  // lets a page that never called mount() (a fresh redirect-return page) show the result screens.
  async submitDetails(redirectResult: string, paymentCheckoutReference?: string, selector?: HTMLElement | string) {
    try {
      if (selector) {
        this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
      }

      // Advanced (hosted) mode with an invalid configuration has no working flow to continue on.
      if (this.initializationFailed) {
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return;
      }

      const { resultCode, errorMessage } = await this.configuration.paymentFlow.submitAdditionalDetails({
        paymentCheckoutReference,
        details: { redirectResult },
      });

      dispatchFinalResult(resultCode, {
        configuration: this.configuration,
        handleSuccess: (message) => this.handleSuccess(message),
        handleError: (message) => this.handleError(message),
        failureMessage: errorMessage,
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
