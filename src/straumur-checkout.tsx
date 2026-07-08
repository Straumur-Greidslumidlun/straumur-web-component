import { h, render } from "preact";
import "./styles/main.css";
import {
  ResultMessage,
  StraumurCheckoutConfiguration,
  StraumurWebAdvancedConfiguration,
  StraumurWebConfiguration,
  StraumurWebInternalConfiguration,
} from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { Language } from "./localizations/translations";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { SuccessResponse } from "./services/models";
import FailureIcon from "./assets/icons/failure";
import LoaderIcon from "./assets/icons/loader";
import SuccessIcon from "./assets/icons/success";
import {
  AdyenCheckout,
  AdditionalDetailsData,
  UIElement,
  UIElementProps,
  AdditionalDetailsActions,
} from "@adyen/adyen-web";
import { I18nProvider } from "./localizations/i18n-context";
import { I18nService } from "./localizations/i18n-service";
import { SubmitApi } from "./components/payment-method-group/payment-method-group-context";
import { createAdvancedPaymentFlow, createSessionPaymentFlow, toResultMessage } from "./flows/payment-flow";
import { normalizeAdvancedConfiguration } from "./services/advanced-normalizer";

function isSessionConfiguration(config: StraumurWebInternalConfiguration): config is StraumurWebConfiguration {
  return typeof config.sessionId === "string" && config.sessionId.length > 0;
}

// the union only protects TypeScript consumers — IIFE consumers get no compile-time checking
function isValidAdvancedConfiguration(config: StraumurWebAdvancedConfiguration): boolean {
  return (
    typeof config.clientKey === "string" &&
    config.clientKey.length > 0 &&
    typeof config.countryCode === "string" &&
    config.countryCode.length > 0 &&
    typeof config.paymentMethods === "object" &&
    config.paymentMethods !== null &&
    typeof config.amount === "object" &&
    config.amount !== null &&
    typeof config.amount.value === "number" &&
    typeof config.amount.currency === "string" &&
    typeof config.onSubmit === "function" &&
    typeof config.onAdditionalDetails === "function"
  );
}

// Session mode has no countryCode input and the payment-methods response carries none,
// so it is fixed to Iceland until the backend provides one.
const SESSION_COUNTRY_CODE = "IS";

function determineLocale(locale: "is" | "en" | undefined): Language {
  switch (locale) {
    case "is":
      return "is-IS";
    case "en":
      return "en-US";
    default:
      return "is-IS";
  }
}

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
    const config = publicConfig as StraumurWebInternalConfiguration;
    const locale = determineLocale(config.locale);
    const isSession = isSessionConfiguration(config);

    this.configuration = {
      mode: isSession ? "session" : "advanced",
      sessionId: config.sessionId,
      environment: config.environment,
      countryCode: isSession ? SESSION_COUNTRY_CODE : config.countryCode,
      paymentFlow: isSession
        ? createSessionPaymentFlow(config.environment, config.sessionId)
        : createAdvancedPaymentFlow(config),
      onPaymentCompleted: config.onPaymentCompleted,
      onPaymentFailed: config.onPaymentFailed,
      placeholders: config.placeholders,
      locale,
      customLocalizations: config.localizations,
      instantPayments: config.instantPayments,
    };

    if (!isSession) {
      if (isValidAdvancedConfiguration(config)) {
        this.advancedConfiguration = config;
        this.paymentMethods = normalizeAdvancedConfiguration(config, locale);
      } else {
        this.initializationFailed = true;
      }
    }

    // Create i18n instance
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

      render(
        <RootComponent>
          <div className="straumur__component">
            <LoaderIcon />
          </div>
        </RootComponent>,
        this.mountElement
      );

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
      <RootComponent>
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
      <RootComponent>
        <div className="straumur__component">
          <SuccessIcon />
          <p>{"key" in message ? this.i18n.t(message.key) : message.text}</p>
        </div>
      </RootComponent>,
      this.mountElement
    );
  }

  handleError(message: ResultMessage) {
    if (!this.mountElement) return;

    render(
      <RootComponent>
        <div className="straumur__component">
          <FailureIcon />
          <p>{"key" in message ? this.i18n.t(message.key) : message.text}</p>
        </div>
      </RootComponent>,
      this.mountElement
    );
  }

  // selector lets a page that never called mount() (e.g. a 3DS redirect return) show the result screens
  async submitDetails(redirectResult: string, selector?: HTMLElement | string) {
    if (selector) {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;
    }

    if (this.configuration.mode === "advanced") {
      if (this.initializationFailed || !this.advancedConfiguration) {
        this.handleError({ key: "error.failedToInitializeStraumurWebComponent" });
        return;
      }

      const checkout = await AdyenCheckout({
        environment: this.configuration.environment,
        clientKey: this.advancedConfiguration.clientKey,
        paymentMethodsResponse: this.advancedConfiguration.paymentMethods,
        countryCode: this.configuration.countryCode,
        onAdditionalDetails: this.handleOnSubmitAdditionalData,
      });

      checkout.submitDetails({
        details: {
          redirectResult,
        },
      });

      return;
    }

    const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId!);

    if (response.resultCode === "Error") {
      this.handleError({ key: response.error });
      return;
    }

    const checkout = await AdyenCheckout({
      environment: this.configuration.environment,
      clientKey: response.clientKey,
      paymentMethodsResponse: response.paymentMethods,
      countryCode: this.configuration.countryCode,
      onAdditionalDetails: this.handleOnSubmitAdditionalData,
    });

    checkout.submitDetails({
      details: {
        redirectResult,
      },
    });
  }

  // arrow function so `this` stays bound when Adyen invokes the handler
  private handleOnSubmitAdditionalData = async (
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) => {
    try {
      const { resultCode, action, errorMessage } = await this.configuration.paymentFlow.submitAdditionalDetails(
        state.data
      );

      actions.resolve({ resultCode, action } as Parameters<AdditionalDetailsActions["resolve"]>[0]);

      if (resultCode === "Authorised") {
        this.handleSuccess({ key: "success.paymentAuthorized" });
        this.configuration.onPaymentCompleted?.({ resultCode });
      } else {
        this.handleError(errorMessage ? { text: errorMessage } : { key: "error.paymentUnsuccessful" });
        this.configuration.onPaymentFailed?.({ resultCode });
      }
    } catch (error) {
      actions.reject();
      this.handleError(toResultMessage(error, "error.failedToSubmitPaymentDetails"));
      this.configuration.onPaymentFailed?.();
    }
  };

  updateConfig(newConfig: Partial<Omit<StraumurCheckoutConfiguration, "mode" | "paymentFlow">>): void {
    this.configuration = {
      ...this.configuration,
      ...newConfig,
    };

    // Update i18n if locale or customLocalizations changed
    if (newConfig.locale) {
      this.i18n.setLanguage(newConfig.locale);
    }
    if (newConfig.customLocalizations) {
      this.i18n.updateCustomLocalizations(newConfig.customLocalizations);
    }

    // Re-render the component with new config
    if (this.mountElement) {
      this.renderComponent();
    }
  }

  setLanguage(locale: Language): void {
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

function RootComponent({ children }: { children: h.JSX.Element }) {
  return <div className="straumur__root-component">{children}</div>;
}
