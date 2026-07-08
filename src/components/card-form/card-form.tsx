import { Fragment, h } from "preact";
import { useRef, useState, useEffect, StateUpdater, Dispatch } from "preact/hooks";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
import {
  AdyenCheckout,
  AdyenCheckoutError,
  CustomCard,
  ICore,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import { useI18n } from "../../localizations/i18n-context";
import { Tooltip } from "../tooltip/tooltip";
import InfoIcon from "../../assets/icons/info";
import { BrandHidden } from "../../utils/renderBrandIcons";
import LoaderIcon from "../../assets/icons/loader";
import CheckmarkIcon from "../../assets/icons/checkmark";
import { RenderDualBrandComponent, DualBrandConfiguration } from "../render-dual-brand/render-dual-brand";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { createAdyenPaymentHandlers } from "../shared/create-adyen-handlers";

export interface CardFormProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  onBrandHidden: Dispatch<StateUpdater<BrandHidden[]>>;
}

type CardFormError = {
  encryptedCardNumber: {
    visible: boolean;
    message?: string;
  };
  encryptedExpiryDate: {
    visible: boolean;
    message?: string;
  };
  encryptedSecurityCode: {
    visible: boolean;
    message?: string;
  };
};

type CardFormErrorField = keyof CardFormError;

function CardForm({ configuration, paymentMethods, onBrandHidden }: CardFormProps): h.JSX.Element | null {
  const cardElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const customCardRef = useRef<CustomCard>();
  const { i18n } = useI18n();
  const [payButtonDisabled, setPayButtonDisabled] = useState<boolean>(true);
  const [securityCodePolicy, setSecurityCodePolicy] = useState<"hidden" | "optional" | "required">("required");
  const [storePaymentMethod, setStorePaymentMethod] = useState(false);
  const [isDualBrand, setIsDualBrand] = useState(false);
  const [dualBrandConfiguration, setDualBrandConfiguration] = useState<DualBrandConfiguration | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const storePaymentMethodRef = useRef(false);
  const [formErrors, setFormErrors] = useState<CardFormError>({
    encryptedCardNumber: { visible: false },
    encryptedExpiryDate: { visible: false },
    encryptedSecurityCode: { visible: false },
  });

  const {
    activePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
    hasCard,
    registerSubmitHandler,
    unregisterSubmitHandler,
  } = usePaymentMethodGroup();

  useEffect(() => {
    const isActive = activePaymentMethod === "card" && isPaymentMethodInitialized.card;
    if (!isActive) {
      // Nothing selected yet, or a different payment method is active - tell the
      // host explicitly so a custom submit button can default to disabled.
      configuration.onCardValidityChanged?.(false, false);
      return;
    }

    registerSubmitHandler(handleSubmitClick);
    return () => {
      unregisterSubmitHandler(handleSubmitClick);
      configuration.onCardValidityChanged?.(false, false);
    };
  }, [activePaymentMethod, isPaymentMethodInitialized.card, registerSubmitHandler, unregisterSubmitHandler]);

  // Computed defensively (optional chaining + fallback) because it runs on every render,
  // ahead of the render guards below. Keeping every hook unconditional satisfies the Rules
  // of Hooks; initializeAdyenComponent is only ever invoked while the card method is active.
  const schemeBrands =
    paymentMethods.paymentMethods?.paymentMethods?.find((x) => x.type === "scheme")?.brands ?? [];

  const { handleOnSubmit, handleOnSubmitAdditionalData, handlePaymentCompleted, handlePaymentFailed } =
    createAdyenPaymentHandlers({
      configuration,
      handleSuccess,
      handleError,
      setThreeDSecureActive,
      enrichSubmitData: (data) => ({
        ...data,
        storePaymentMethod: storePaymentMethodRef.current,
      }),
    });

  const initializeAdyenComponent = async () => {
    // Fully tear down any previous instance before re-initializing (e.g. on locale change),
    // otherwise the old secure iframes leak and stack up on the same DOM node. Uses remove()
    // (destroy-style cleanup) to match the wallet components (google-pay/apple-pay buttons).
    customCardRef.current?.remove();

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
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onError: handleOnError,
      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    customCardRef.current = new CustomCard(adyenCardRef.current, {
      brands: schemeBrands,
      placeholders: configuration.placeholders,
      challengeWindowSize: "05",
      onBinLookup: (event) => {
        if (event.supportedBrandsRaw && event.supportedBrandsRaw.length > 1) {
          setIsDualBrand(true);

          setDualBrandConfiguration({
            brand1: event.supportedBrandsRaw[0].brand,
            brand1Name: event.supportedBrandsRaw[0].localeBrand,
            brand1ImageUrl: event.supportedBrandsRaw[0].brandImageUrl,
            brand2: event.supportedBrandsRaw[1].brand,
            brand2Name: event.supportedBrandsRaw[1].localeBrand,
            brand2ImageUrl: event.supportedBrandsRaw[1].brandImageUrl,
          });
        }
      },
      onBrand: (event) => {
        setSecurityCodePolicy(event.cvcPolicy);
        if (event.brand === "card") {
          onBrandHidden([]);
          setSelectedBrand(null);
          return;
        }

        const selectedBrands = schemeBrands
          .filter((x) => x !== event.brand)
          .map((x) => {
            return {
              brand: x,
            };
          });

        onBrandHidden(selectedBrands);

        if (
          schemeBrands
            .filter((x) => x === event.brand)
            .map((x) => {
              return {
                brand: x,
              };
            }).length === 1
        ) {
          setSelectedBrand(event.brand);
        }
      },
      onConfigSuccess() {
        updatePaymentMethodInitialization("card", true);
      },
      onValidationError: (event) => {
        const defaultErrors: CardFormError = {
          encryptedCardNumber: { visible: false, message: undefined },
          encryptedExpiryDate: { visible: false, message: undefined },
          encryptedSecurityCode: { visible: false, message: undefined },
        };

        event
          .filter((x) => x.error)
          .forEach((x) => {
            defaultErrors[x.fieldType as CardFormErrorField].visible = true;
            defaultErrors[x.fieldType as CardFormErrorField].message = x.errorI18n;
          });

        setFormErrors(defaultErrors);
      },
      onAllValid: (event) => {
        setPayButtonDisabled(!event.allValid);
        configuration.onCardValidityChanged?.(event.allValid, true);
      },
    });

    if (cardElementRef.current) {
      customCardRef.current.mount(cardElementRef.current);
    }
  };

  useEffect(() => {
    if (hasCard && activePaymentMethod === "card" && !isPaymentMethodInitialized.card) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod]);

  useEffect(() => {
    if (customCardRef.current && isPaymentMethodInitialized.card) {
      // Most of the time we will change configuration only to update locale, and that's not possible through .update() -> https://github.com/Adyen/adyen-web/issues/2407
      // So we need to reinitialize the component.
      initializeAdyenComponent();
      setFormErrors({
        encryptedCardNumber: { visible: false, message: undefined },
        encryptedExpiryDate: { visible: false, message: undefined },
        encryptedSecurityCode: { visible: false, message: undefined },
      });
    }
  }, [configuration]);

  useEffect(() => {
    storePaymentMethodRef.current = storePaymentMethod;
  }, [storePaymentMethod]);

  function dualBrandListener(e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) {
    customCardRef.current!.dualBrandingChangeHandler(e);
  }

  function handleStorePaymentMethodChange(event: h.JSX.TargetedEvent<HTMLInputElement, Event>) {
    setStorePaymentMethod(event.currentTarget.checked);
  }

  function handleOnError(_: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined): void {
    handleError({ key: "error.unknownError" });
  }

  async function handleSubmitClick() {
    if (!customCardRef.current) return;

    const { beforeSubmit } = configuration.paymentFlow;

    if (beforeSubmit && !(await beforeSubmit())) {
      return;
    }

    customCardRef.current!.submit();
  }

  // Render guards live below all hooks so hook order is identical on every render.
  if (!hasCard || (activePaymentMethod !== "card" && threeDSecureActive)) {
    // If 3-D Secure is active for another payment method, do not show the card form.
    return null;
  }

  if (paymentMethods.paymentMethods?.paymentMethods?.length === 0) {
    return null;
  }

  return (
    <div
      className="straumur__card-component__expandable"
      ref={cardElementRef}
      style={{
        height: threeDSecureActive ? "600px" : "auto",
        minWidth: threeDSecureActive ? "350px" : "auto",
      }}
    >
      {!isPaymentMethodInitialized.card && (
        <div className="straumur__card-component__loading-text">
          <LoaderIcon />
        </div>
      )}

      <div
        className="straumur__card-component__form"
        style={{
          opacity: isPaymentMethodInitialized.card && !threeDSecureActive ? 1 : 0,
          position: isPaymentMethodInitialized.card && !threeDSecureActive ? "relative" : "absolute",
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        <div className="straumur__card-component__form--wrapper">
          <label
            className={`${"straumur__card-component__form--wrapper--label"} ${
              formErrors.encryptedCardNumber.visible ? "straumur__card-component__form--wrapper--label--error" : ""
            }`}
          >
            {i18n.t("cards.cardNumber")}
          </label>
          <span
            className={`${"straumur__card-component__form--wrapper--input"} ${
              formErrors.encryptedCardNumber.visible ? "straumur__card-component__form--wrapper--input--error" : ""
            }`}
            data-cse="encryptedCardNumber"
          />
          {formErrors.encryptedCardNumber.visible && (
            <span className="straumur__card-component__form--wrapper--error">
              {formErrors.encryptedCardNumber.message}
            </span>
          )}
        </div>
        <div className="straumur__card-component__form--field-wrapper">
          <div className="straumur__card-component__form--wrapper">
            <label
              className={`${"straumur__card-component__form--wrapper--label"} ${
                formErrors.encryptedExpiryDate.visible ? "straumur__card-component__form--wrapper--label--error" : ""
              }`}
            >
              {i18n.t("cards.expiryDate")}
            </label>
            <span
              className={`${"straumur__card-component__form--wrapper--input"} ${
                formErrors.encryptedExpiryDate.visible ? "straumur__card-component__form--wrapper--input--error" : ""
              }`}
              data-cse="encryptedExpiryDate"
            />
            {formErrors.encryptedExpiryDate.visible && (
              <span className="straumur__card-component__form--wrapper--error">
                {formErrors.encryptedExpiryDate.message}
              </span>
            )}
          </div>

          <div className="straumur__card-component__form--wrapper">
            {(securityCodePolicy === "optional" || securityCodePolicy === "required") && (
              <Fragment>
                <label
                  className={`${"straumur__card-component__form--wrapper--label"} ${
                    formErrors.encryptedSecurityCode.visible
                      ? "straumur__card-component__form--wrapper--label--error"
                      : ""
                  }`}
                >
                  {securityCodePolicy === "optional"
                    ? i18n.t("cards.securityCode3DigitsOptional")
                    : i18n.t("cards.securityCode3Digits")}
                </label>
                <span
                  className={`${"straumur__card-component__form--wrapper--input"} ${
                    formErrors.encryptedSecurityCode.visible
                      ? "straumur__card-component__form--wrapper--input--error"
                      : ""
                  }`}
                  data-cse="encryptedSecurityCode"
                />
                {formErrors.encryptedSecurityCode.visible && (
                  <span className="straumur__card-component__form--wrapper--error">
                    {formErrors.encryptedSecurityCode.message}
                  </span>
                )}
                <div className="straumur__card-component__form--wrapper--label--info">
                  <Tooltip content={<span>{i18n.t("cards.securityCode3DigitsInfo")}</span>}>
                    <InfoIcon />
                  </Tooltip>
                </div>
              </Fragment>
            )}
          </div>
        </div>

        {isDualBrand && dualBrandConfiguration && (
          <RenderDualBrandComponent
            dualBrandConfiguration={dualBrandConfiguration}
            selectedBrand={selectedBrand}
            onBrandClick={dualBrandListener}
          />
        )}

        {paymentMethods.enableStoreDetails === "AskForConsent" && (
          <label className="straumur__card-component__form--wrapper--label-checkbox">
            <div
              className={`${"straumur__card-component__form--wrapper--label-checkbox--checkmark"} ${
                storePaymentMethod ? "straumur__card-component__form--wrapper--label-checkbox--checkmark--checked" : ""
              }`}
            >
              <div
                className={`${"straumur__card-component__form--wrapper--label-checkbox--checkmark--icon"} ${
                  storePaymentMethod
                    ? "straumur__card-component__form--wrapper--label-checkbox--checkmark--icon--checked"
                    : ""
                }`}
              >
                <CheckmarkIcon />
              </div>
            </div>
            <input
              type="checkbox"
              className="straumur__card-component__form--wrapper--label-checkbox--checkbox"
              checked={storePaymentMethod}
              onChange={handleStorePaymentMethodChange}
            />
            {i18n.t("cards.storePaymentMethod")}
          </label>
        )}

        {!configuration.hideSubmitButton && (
          <button
            className="straumur__card-component__submit-button"
            disabled={payButtonDisabled}
            onClick={handleSubmitClick}
          >
            {paymentMethods.minorUnitsAmount === 0 ? i18n.t("cards.saveCardDetails") : paymentMethods.formattedAmount}
          </button>
        )}
      </div>
    </div>
  );
}

export default CardForm;
