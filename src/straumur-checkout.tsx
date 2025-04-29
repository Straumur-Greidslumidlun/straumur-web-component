import { h, render } from "preact";
import "@adyen/adyen-web/styles/adyen.css";
import "./styles/main.css";
import { StraumurCheckoutConfiguration, StraumurWebConfiguration } from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { Language, TranslationKey } from "./localizations/translations";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { SuccessResponse } from "./services/models";
import FailureIcon from "./assets/icons/failure";
import i18n from "./localizations/i18n";
import LoaderIcon from "./assets/icons/loader";

class StraumurCheckout {
  private configuration: StraumurCheckoutConfiguration;
  private paymentMethods: SuccessResponse | null = null;
  private mountElement: HTMLElement | null = null;

  constructor(config: StraumurWebConfiguration) {
    this.configuration = { ...config, locale: config.locale || "en-US" }; // Default to en-US if locale is not provided. Later we can use the locale from the payment methods response.
  }

  async mount(selector: HTMLElement | string): Promise<void> {
    try {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;

      if (!this.mountElement) {
        this.handleError("error.failedToInitializeStraumurWebComponent");
        return;
      }

      render(
        <div className="component">
          <LoaderIcon />
        </div>,
        this.mountElement
      );

      const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId);

      if (response.resultCode === "Error") {
        this.handleError(response.error);
        return;
      }

      this.paymentMethods = response;

      this.configuration.locale = this.configuration.locale || this.paymentMethods.locale;

      this.renderComponent();
    } catch (error) {}
  }

  private renderComponent(): void {
    if (!this.mountElement) return;

    render(
      <StraumurCheckoutContainer configuration={this.configuration} paymentMethods={this.paymentMethods!} />,
      this.mountElement
    );
  }

  updateConfig(newConfig: Partial<StraumurCheckoutConfiguration>): void {
    this.configuration = {
      ...this.configuration,
      ...newConfig,
    };

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
  }

  handleError(message: TranslationKey) {
    render(
      <div className="component">
        <FailureIcon />
        <p>{i18n(this.configuration.locale, message)}</p>
      </div>,
      this.mountElement!
    );
  }
}

export default StraumurCheckout;
