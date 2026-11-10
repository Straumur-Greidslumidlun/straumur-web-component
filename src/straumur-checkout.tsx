import { h, render } from "preact";
import "./styles/main.css";
import { registerWidgetFonts } from "./styles/fonts";
import {
  ResultMessage,
  StraumurCheckoutConfiguration,
  StraumurCheckoutUpdateOptions,
  StraumurWebConfiguration,
} from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { normalizeLocale, normalizeLocalizations, PublicLocale } from "./localizations/locale";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { SuccessResponse } from "./services/models";
import { I18nProvider } from "./localizations/i18n-context";
import { I18nService } from "./localizations/i18n-service";
import { SubmitApi } from "./components/payment-method-group/payment-method-group-context";
import { dispatchFinalResult } from "./components/shared/dispatch-final-result";
import { LoaderScreen, RootComponent, StatusScreen } from "./components/shared/status-screen";
import { buildCheckoutConfiguration, normalizeTheme } from "./config/build-checkout-configuration";

// Captured by the payment flow at construction; changing them later would load one session and pay
// into another.
// The logger is created once per instance too: replacing it would drop its queue and listeners.
const FIXED_CONFIG_KEYS = ["sessionId", "environment", "countryCode", "mode", "paymentFlow", "logger"] as const;

// Method types only (never ids or tokens), plus "storedcard" when the shopper has saved cards.
function describePaymentMethods(response: SuccessResponse): { count: number; methods: string } {
  const types = (response.paymentMethods?.paymentMethods ?? []).map((x) => x.type);

  if ((response.paymentMethods?.storedPaymentMethods ?? []).length > 0) {
    types.push("storedcard");
  }

  return { count: types.length, methods: types.join(",") };
}

class StraumurCheckout {
  private configuration: StraumurCheckoutConfiguration;
  private paymentMethods: SuccessResponse | null = null;
  private mountElement: HTMLElement | null = null;
  private i18n: I18nService;
  private submitApi: SubmitApi | null = null;
  private initializationFailed = false;
  // Set once a class-level result screen is showing (init failure, redirect-return result). A later
  // updateConfig/setLanguage must re-render THAT screen, never bring the checkout form back — after a
  // success that would let the shopper pay twice.
  private resultScreen: { variant: "success" | "failure"; message: ResultMessage } | null = null;

  // Public signature accepts the session configuration only. The advanced-mode configuration
  // (internal, used by Straumur Hosted Checkout via the IIFE bundle) is detected at runtime.
  constructor(publicConfig: StraumurWebConfiguration) {
    const initialization = buildCheckoutConfiguration(publicConfig);

    this.configuration = initialization.configuration;
    this.paymentMethods = initialization.paymentMethods;
    this.initializationFailed = initialization.initializationFailed;
    this.i18n = new I18nService(this.configuration.locale, this.configuration.customLocalizations);
    this.configuration.logger.start();
  }

  async mount(selector: HTMLElement | string): Promise<void> {
    registerWidgetFonts();
    try {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
      this.resultScreen = null;
      this.configuration.logger.log("lifecycle.mount");

      if (!this.mountElement) {
        return;
      }

      if (this.initializationFailed) {
        this.configuration.logger.log("lifecycle.mountFailed", {
          errorKey: "error.failedToInitializeStraumurWebComponent",
        });
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return;
      }

      if (this.configuration.mode === "advanced") {
        if (this.paymentMethods) {
          this.configuration.logger.log("lifecycle.methodsLoaded", describePaymentMethods(this.paymentMethods));
        }
        this.renderComponent();
        return;
      }

      render(
        <LoaderScreen theme={this.configuration.theme} label={this.i18n.t("payment.loading")} />,
        this.mountElement
      );

      const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId!);

      if (response.resultCode === "Error") {
        this.configuration.logger.log("lifecycle.mountFailed", { errorKey: response.error });
        this.handleError({ key: response.error });
        return;
      }

      this.paymentMethods = response;
      this.configuration.logger.log("lifecycle.methodsLoaded", describePaymentMethods(response));

      this.renderComponent();
    } catch (error) {
      // Never throw into the host page, but leave a trace for the merchant's console — and replace
      // the loader, which would otherwise spin forever.
      console.error("[StraumurCheckout] mount() failed:", error);
      this.configuration.logger.log("lifecycle.mountFailed", { errorKey: "error.failedToInitializePaymentMethods" });
      this.handleError({ key: "error.failedToInitializePaymentMethods" });
    }
  }

  private renderComponent(): void {
    // No payment methods yet (session fetch in flight, it failed, or a redirect-return page that only
    // called submitDetails): nothing to render. A pending mount() picks up the new configuration.
    if (!this.mountElement || !this.paymentMethods) return;

    render(
      <RootComponent theme={this.configuration.theme}>
        <I18nProvider i18nService={this.i18n}>
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

  // Internal: the class-level result screens (init failure, redirect return). Not part of the public API.
  private handleSuccess(message: ResultMessage) {
    this.showResultScreen("success", message);
  }

  private handleError(message: ResultMessage) {
    this.showResultScreen("failure", message);
  }

  private showResultScreen(variant: "success" | "failure", message: ResultMessage): void {
    if (!this.mountElement) return;

    this.resultScreen = { variant, message };
    render(
      <StatusScreen variant={variant} message={message} i18n={this.i18n} theme={this.configuration.theme} />,
      this.mountElement
    );
  }

  // Redirect return (both Adyen redirect-3DS and Kortalán): POST /additional-details directly through
  // the payment flow — no Adyen SDK, so it also works for a native-only terminal that has no clientKey.
  // The backend routes the continuation to the correct provider by paymentCheckoutReference. selector
  // lets a page that never called mount() (a fresh redirect-return page) show the result screens.
  async submitDetails(redirectResult: string, paymentCheckoutReference?: string, selector?: HTMLElement | string) {
    registerWidgetFonts();
    try {
      if (selector) {
        this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
      }

      // Advanced (hosted) mode with an invalid configuration has no working flow to continue on.
      if (this.initializationFailed) {
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return;
      }

      this.configuration.logger.log("payment.redirectReturn", {
        hasPaymentCheckoutReference: !!paymentCheckoutReference,
      });

      // The shopper just landed back from the 3DS/Kortalán redirect: show progress while /details runs.
      if (this.mountElement) {
        render(
          <LoaderScreen theme={this.configuration.theme} label={this.i18n.t("payment.loading")} />,
          this.mountElement
        );
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
    // Option names only, never their values (callbacks, localization strings).
    this.configuration.logger.log("lifecycle.updateConfig", { keys: Object.keys(newConfig ?? {}).join(",") });
    const { locale, localizations, customLocalizations, theme, ...rest } = newConfig;

    // IIFE consumers get no type checking: refuse the fields that are fixed for the instance's
    // lifetime instead of silently storing values the payment flow will never use.
    const fixed = rest as Partial<Record<(typeof FIXED_CONFIG_KEYS)[number], unknown>>;
    for (const key of FIXED_CONFIG_KEYS) {
      if (key in fixed) {
        console.warn(`[StraumurCheckout] updateConfig: "${key}" cannot change after construction; ignored.`);
        delete fixed[key];
      }
    }

    // `localizations` is the public name (as in the constructor); `customLocalizations` is the legacy alias.
    const normalizedLocalizations = normalizeLocalizations(localizations ?? customLocalizations);

    this.configuration = {
      ...this.configuration,
      ...rest,
      // A theme object carries button overrides; flatten it exactly like the constructor does.
      ...(theme !== undefined ? normalizeTheme(theme) : {}),
      // Deprecated flat overrides still win when passed explicitly.
      ...(rest.googlePayButtonTheme ? { googlePayButtonTheme: rest.googlePayButtonTheme } : {}),
      ...(rest.applePayButtonTheme ? { applePayButtonTheme: rest.applePayButtonTheme } : {}),
      // The public vocabulary is short codes; normalizeLocale also tolerates legacy full tags at runtime.
      ...(locale ? { locale: normalizeLocale(locale) } : {}),
      ...(normalizedLocalizations ? { customLocalizations: normalizedLocalizations } : {}),
    };

    if (locale) {
      this.i18n.setLanguage(this.configuration.locale);
    }
    if (normalizedLocalizations) {
      this.i18n.updateCustomLocalizations(normalizedLocalizations);
    }

    // Re-render with the new config: the result screen if one is showing (so a language/theme change
    // still applies to it), otherwise the checkout.
    if (this.resultScreen) {
      this.showResultScreen(this.resultScreen.variant, this.resultScreen.message);
    } else {
      this.renderComponent();
    }
  }

  setLanguage(locale: PublicLocale): void {
    this.configuration.logger.log("lifecycle.setLanguage", { locale });
    this.updateConfig({
      locale: locale,
    });
  }

  destroy(): void {
    // Send what is queued now: the host may remove the page next.
    this.configuration.logger.log("lifecycle.destroy");
    this.configuration.logger.stop();

    if (this.mountElement) {
      render(null, this.mountElement);
      this.mountElement = null;
    }
    this.resultScreen = null;
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
    this.configuration.logger.log("ui.submitCardCalled", { accepted: triggered });

    if (!triggered) {
      console.warn(
        "[StraumurCheckout] submitCard() called but no card-type payment method is currently active and initialized."
      );
    }

    return triggered;
  }
}

export default StraumurCheckout;
