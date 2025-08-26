import { h, render } from "preact";
import "./styles/main.css";
import { StraumurCheckoutConfiguration, StraumurWebConfiguration } from "./models/models";
import { setupPaymentMethods } from "./services/straumur-service";
import { Language, TranslationKey } from "./localizations/translations";
import StraumurCheckoutContainer from "./features/straumur-checkout-container";
import { SuccessResponse } from "./services/models";
import FailureIcon from "./assets/icons/failure";
import i18n from "./localizations/i18n";
import LoaderIcon from "./assets/icons/loader";
import {
  AdyenCheckout,
  AdditionalDetailsData,
  UIElement,
  UIElementProps,
  AdditionalDetailsActions,
} from "@adyen/adyen-web";
import { ICreateDetailsBody } from "./adapter/models";
import { createDetailsRequest } from "./adapter/straumur-adapter";
import SuccessIcon from "./assets/icons/success";

class StraumurCheckout {
  private configuration: StraumurCheckoutConfiguration;
  private paymentMethods: SuccessResponse | null = null;
  private mountElement: HTMLElement | null = null;

  constructor(config: StraumurWebConfiguration) {
    this.configuration = { ...config, locale: determineLocale(config.locale) };

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
  }

  async mount(selector: HTMLElement | string): Promise<void> {
    try {
      this.mountElement = typeof selector === "string" ? document.querySelector(selector) : selector;

      if (!this.mountElement) {
        this.handleError("error.failedToInitializeStraumurWebComponent");
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
      <RootComponent>
        <StraumurCheckoutContainer configuration={this.configuration} paymentMethods={this.paymentMethods!} />
      </RootComponent>,
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

  handleSuccess(message: TranslationKey) {
    render(
      <RootComponent>
        <div className="straumur__component">
          <SuccessIcon />
          <p>{i18n(this.configuration.locale, message)}</p>
        </div>
      </RootComponent>,
      this.mountElement!
    );
  }

  async submitDetails(redirectResult: string) {
    const response = await setupPaymentMethods(this.configuration.environment, this.configuration.sessionId);

    if (response.resultCode === "Error") {
      this.handleError(response.error);
      return;
    }

    const checkout = await AdyenCheckout({
      environment: this.configuration.environment,
      clientKey: response.clientKey,
      paymentMethodsResponse: response.paymentMethods,
      countryCode: "IS",
      onAdditionalDetails: this.handleOnSubmitAdditionalData,
    });

    checkout.submitDetails({
      details: {
        redirectResult,
      },
    });
  }

  private async handleOnSubmitAdditionalData(
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) {
    const data: ICreateDetailsBody = {
      ...state.data,
      sessionId: this.configuration.sessionId,
    };

    const fetchResponse = await createDetailsRequest(this.configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      this.handleError("error.failedToSubmitPaymentDetails");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should always be either Authorised or Refused or IdentifyShopper. Never empty.
    if (!response.resultCode) {
      actions.reject();
      this.handleError("error.paymentDetailsFailed");
      return;
    }

    const { resultCode, action } = response;

    actions.resolve({ resultCode, action });

    if (resultCode === "Authorised") {
      this.handleSuccess("success.paymentAuthorized");
    } else {
      this.handleError("error.paymentUnsuccessful");
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
      <RootComponent>
        <div className="straumur__component">
          <FailureIcon />
          <p>{i18n(this.configuration.locale, message)}</p>
        </div>
      </RootComponent>,
      this.mountElement!
    );
  }
}

export default StraumurCheckout;

function RootComponent({ children }: { children: h.JSX.Element }) {
  return <div className="straumur__root-component">{children}</div>;
}
