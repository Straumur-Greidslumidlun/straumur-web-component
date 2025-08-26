import { Fragment, h } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import "./card-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import {
  AdditionalDetailsActions,
  AdditionalDetailsData,
  AdyenCheckout,
  AdyenCheckoutError,
  CustomCard,
  ICore,
  PaymentCompletedData,
  PaymentFailedData,
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import i18n from "../../localizations/i18n";
import { Tooltip } from "../../components/tooltip/tooltip";
import CardIcon from "../../assets/icons/card";
import InfoIcon from "../../assets/icons/info";
import { BrandHidden, RenderBrandIcons } from "../../utils/renderBrandIcons";
import { CardComponentProps, CardFormError, CardFormErrorField } from "./models";
import LoaderIcon from "../../assets/icons/loader";
import CheckmarkIcon from "../../assets/icons/checkmark";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";

function CardComponent({ configuration, paymentMethods }: CardComponentProps): h.JSX.Element | null {
  const cardElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const customCardRef = useRef<CustomCard>();
  const [payButtonDisabled, setPayButtonDisabled] = useState<boolean>(true);
  const [securityCodePolicy, setSecurityCodePolicy] = useState<"hidden" | "optional" | "required">("required");
  const [storePaymentMethod, setStorePaymentMethod] = useState(false);
  const storePaymentMethodRef = useRef(false);
  const [brandHidden, setBrandHidden] = useState<BrandHidden[]>([]);
  const [formErrors, setFormErrors] = useState<CardFormError>({
    encryptedCardNumber: { visible: false },
    encryptedExpiryDate: { visible: false },
    encryptedSecurityCode: { visible: false },
  });

  const hasCardPaymentMethod = paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "scheme");

  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
  } = usePaymentMethodGroup();

  if (!hasCardPaymentMethod || (activePaymentMethod !== "card" && threeDSecureActive)) {
    // if threeDSecureActive for some other payment method, do not show card form
    return null;
  }

  const schemeBrands = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "scheme")!.brands!;

  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      environment: configuration.environment,
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      locale: configuration.locale,
      countryCode: "IS",
      paymentMethodsResponse: paymentMethods.paymentMethods,
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onError: handleOnError,
      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    customCardRef.current = new CustomCard(adyenCardRef.current, {
      placeholders: configuration.placeholders,
      challengeWindowSize: "05",
      brands: schemeBrands,
      onBrand: (event) => {
        setSecurityCodePolicy(event.cvcPolicy);
        if (event.brand === "card") {
          setBrandHidden([]);
          return;
        }

        setBrandHidden(
          schemeBrands
            .filter((x) => x !== event.brand)
            .map((x) => {
              return {
                brand: x,
              };
            })
        );
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
      },
    });

    if (cardElementRef.current) {
      customCardRef.current.mount(cardElementRef.current);
    }
  };

  useEffect(() => {
    if (activePaymentMethod === "card" && !isPaymentMethodInitialized.card) {
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

  const handleBoxChange = () => {
    setActivePaymentMethod("card");
  };

  if (paymentMethods.paymentMethods?.paymentMethods?.length === 0) {
    return null;
  }

  const brands = schemeBrands.map((x) => {
    return { brand: x, brandFullName: x };
  });

  function handleStorePaymentMethodChange(event: h.JSX.TargetedEvent<HTMLInputElement, Event>) {
    setStorePaymentMethod(event.currentTarget.checked);
  }

  function handleOnError(_: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined): void {
    handleError("error.unknownError");
  }

  useEffect(() => {
    storePaymentMethodRef.current = storePaymentMethod;
  }, [storePaymentMethod]);

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    const data: ICreatePaymentBody = {
      ...state.data,
      storePaymentMethod: storePaymentMethodRef.current,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await createPaymentRequest(configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPayment");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should never be empty.
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentFailed");
      return;
    }

    const { resultCode, action } = response;

    if (resultCode === "ChallengeShopper" || resultCode === "IdentifyShopper") {
      setThreeDSecureActive(true);
    }

    // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
    // You must call this, even if the result of the payment is unsuccessful.
    actions.resolve({ resultCode, action });
  }

  async function handleOnSubmitAdditionalData(
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) {
    const data: ICreateDetailsBody = {
      ...state.data,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await createDetailsRequest(configuration.environment, data);

    // We will always get 200 OK unless there is an error in our server code.
    // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
    if (!fetchResponse.ok) {
      actions.reject();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should always be either Authorised or Refused or IdentifyShopper. Never empty.
    if (!response.resultCode) {
      actions.reject();
      handleError("error.paymentDetailsFailed");
      return;
    }

    const { resultCode, action } = response;

    actions.resolve({ resultCode, action });
  }

  function handlePaymentCompleted(data: PaymentCompletedData, _?: UIElement<UIElementProps> | undefined): void {
    if (data.resultCode === "Authorised") {
      handleSuccess("success.paymentAuthorized");
    } else {
      handleError("error.paymentUnsuccessful");
    }
    configuration.onPaymentCompleted?.();
  }

  function handlePaymentFailed(data?: PaymentFailedData | undefined, _?: UIElement<UIElementProps> | undefined): void {
    if (data) {
      if (data.resultCode === "Authorised") {
        handleSuccess("success.paymentAuthorized");
      } else {
        handleError("error.paymentUnsuccessful");
      }
    }
    configuration.onPaymentFailed?.();
  }

  function handleSubmitClick() {
    if (!customCardRef.current) return;

    customCardRef.current!.submit();
  }

  return (
    <label className="straumur__card-component">
      <input
        type="radio"
        className="straumur__card-component__radio-selector"
        checked={activePaymentMethod === "card"}
        onChange={handleBoxChange}
      />
      <span className="straumur__card-component__content">
        <span className="straumur__card-component--circle"></span>
        <CardIcon />
        <span className="straumur__card-component--text">{i18n(configuration.locale, "cards.title")}</span>
        <span className="straumur__card-component--brands">
          <RenderBrandIcons brands={brands} brandHidden={brandHidden} />
        </span>
      </span>
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
              {i18n(configuration.locale, "cards.cardNumber")}
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
                {i18n(configuration.locale, "cards.expiryDate")}
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
                      ? i18n(configuration.locale, "cards.securityCode3DigitsOptional")
                      : i18n(configuration.locale, "cards.securityCode3Digits")}
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
                    <Tooltip content={<span>{i18n(configuration.locale, "cards.securityCode3DigitsInfo")}</span>}>
                      <InfoIcon />
                    </Tooltip>
                  </div>
                </Fragment>
              )}
            </div>
          </div>

          {paymentMethods.enableStoreDetails === "AskForConsent" && (
            <label className="straumur__card-component__form--wrapper--label-checkbox">
              <div
                className={`${"straumur__card-component__form--wrapper--label-checkbox--checkmark"} ${
                  storePaymentMethod
                    ? "straumur__card-component__form--wrapper--label-checkbox--checkmark--checked"
                    : ""
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
              {i18n(configuration.locale, "cards.storePaymentMethod")}
            </label>
          )}

          <button
            className="straumur__card-component__submit-button"
            disabled={payButtonDisabled}
            onClick={handleSubmitClick}
          >
            {paymentMethods.formattedAmount}
          </button>
        </div>
      </div>
    </label>
  );
}

export default CardComponent;
