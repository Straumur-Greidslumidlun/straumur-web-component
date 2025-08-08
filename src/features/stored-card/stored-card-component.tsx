import { Fragment, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import "./stored-card-component.css";
import i18n from "../../localizations/i18n";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { Tooltip } from "../../components/tooltip/tooltip";
import InfoIcon from "../../assets/icons/info";
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
import { RenderBrandIcons } from "../../utils/renderBrandIcons";
import LoaderIcon from "../../assets/icons/loader";
import { StoredCardComponentProps, StoredCardFormError, StoredCardFormErrorField } from "./models";
import WarningIcon from "../../assets/icons/warning";
import { ICreateDetailsBody, ICreatePaymentBody, IPostDisableTokenBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest, postDisableTokenRequest } from "../../adapter/straumur-adapter";

function StoredCardComponent({
  configuration,
  paymentMethods,
  storedPaymentMethod,
  onStoredCardRemoved,
}: StoredCardComponentProps): h.JSX.Element {
  const storedCardElementRef = useRef<HTMLDivElement>(null);
  const adyenCardRef = useRef<ICore>();
  const customCardRef = useRef<CustomCard>();
  const [payButtonDisabled, setPayButtonDisabled] = useState<boolean>(true);
  const [securityCodePolicy, setSecurityCodePolicy] = useState<"hidden" | "optional" | "required">("required");
  const [askConfirmRemoveStoredCard, setAskConfirmRemoveStoredCard] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<StoredCardFormError>({
    encryptedSecurityCode: { visible: false },
  });
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    activeStoredPaymentMethodId,
    setActiveStoredPaymentMethodId,
    isStoredCardInitialized,
    updateStoredCardInitialization,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    threeDSecureActive,
  } = usePaymentMethodGroup();

  const initializeAdyenComponent = async () => {
    adyenCardRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      environment: configuration.environment,
      locale: configuration.locale,
      countryCode: "IS",
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      paymentMethodsResponse: paymentMethods.paymentMethods,
      onError: handleOnError,

      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    customCardRef.current = new CustomCard(adyenCardRef.current, {
      brands: [storedPaymentMethod.brand!],
      onSubmit: handleOnSubmit,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onConfigSuccess() {
        updateStoredCardInitialization(storedPaymentMethod.id, true);
      },
      onBrand: (event) => {
        setSecurityCodePolicy(event.cvcPolicy);
      },
      onValidationError: (event) => {
        const defaultErrors: StoredCardFormError = {
          encryptedSecurityCode: { visible: false, message: undefined },
        };

        event
          .filter((x) => x.error)
          .forEach((x) => {
            defaultErrors[x.fieldType as StoredCardFormErrorField].visible = true;
            defaultErrors[x.fieldType as StoredCardFormErrorField].message = x.errorI18n;
          });

        setFormErrors(defaultErrors);
      },
      onAllValid: (event) => {
        setPayButtonDisabled(!event.allValid);
      },
      placeholders: configuration.placeholders,
      challengeWindowSize: "05", // looks like not working
    });

    if (storedCardElementRef.current) {
      customCardRef.current.mount(storedCardElementRef.current);
    }
  };

  useEffect(() => {
    if (
      activePaymentMethod === "storedcard" &&
      activeStoredPaymentMethodId === storedPaymentMethod.id &&
      !isStoredCardInitialized[activeStoredPaymentMethodId!]
    ) {
      initializeAdyenComponent();
    }
  }, [configuration, activePaymentMethod, activeStoredPaymentMethodId]);

  useEffect(() => {
    if (customCardRef.current && isStoredCardInitialized[activeStoredPaymentMethodId!]) {
      // Most of the time we will change configuration only to update locale, and that's not possible through .update() -> https://github.com/Adyen/adyen-web/issues/2407
      // So we need to reinitialize the component.
      initializeAdyenComponent();
      setFormErrors({ encryptedSecurityCode: { visible: false, message: undefined } });
    }
  }, [configuration]);

  useEffect(() => {
    setAskConfirmRemoveStoredCard(false);
  }, [activePaymentMethod, activeStoredPaymentMethodId]);

  function handleBoxChange() {
    setActivePaymentMethod("storedcard");
    setActiveStoredPaymentMethodId(storedPaymentMethod.id);
  }

  function handleAskToConfirmRemoveCard() {
    setAskConfirmRemoveStoredCard(true);
  }

  function handleCancelRemoveStoredCard() {
    setAskConfirmRemoveStoredCard(false);
  }

  async function handleConfirmRemoveStoredCard() {
    const data: IPostDisableTokenBody = {
      storedPaymentMethodId: storedPaymentMethod.id,
      sessionId: configuration.sessionId,
    };

    const fetchResponse = await postDisableTokenRequest(configuration.environment, data);

    if (!fetchResponse.ok) {
      handleError("error.failedToSubmitRemoveStoredPaymentCard");
      return;
    }

    const disableTokenResponse = await fetchResponse.json();

    if (!disableTokenResponse.success) {
      handleError("error.failedToRemoveStoredPaymentCard");
      return;
    }

    onStoredCardRemoved(storedPaymentMethod.id);
  }

  function handleOnError(_: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined) {
    handleError("error.unknownError");
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    const data: ICreatePaymentBody = {
      ...state.data,
      sessionId: configuration.sessionId,
      paymentMethod: {
        ...state.data.paymentMethod,
        storedPaymentMethodId: storedPaymentMethod.id,
      },
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
      // const errorResponse = await fetchResponse.json();
      handleError("error.failedToSubmitPaymentDetails");
      return;
    }

    const response = await fetchResponse.json();

    // ResultCode should never be empty.
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
    <label className="straumur__stored-card-component">
      <input
        type="radio"
        className="straumur__stored-card-component__radio-selector"
        checked={activePaymentMethod === "storedcard" && activeStoredPaymentMethodId === storedPaymentMethod.id}
        onChange={handleBoxChange}
      />
      <span className="straumur__stored-card-component__content">
        <span className="straumur__stored-card-component--circle"></span>
        <RenderBrandIcons
          brands={[
            {
              brand: storedPaymentMethod.brand!,
              brandFullName: storedPaymentMethod.name,
            },
          ]}
        />
        <span className="straumur__stored-card-component--text">•••• {storedPaymentMethod.lastFour}</span>
        {activePaymentMethod === "storedcard" &&
          activeStoredPaymentMethodId === storedPaymentMethod.id &&
          isStoredCardInitialized[storedPaymentMethod.id] && (
            <div className="straumur__stored-card-component__remove-stored-card-button">
              <button
                onClick={handleAskToConfirmRemoveCard}
                className="straumur__stored-card-component__remove-stored-card-button--text"
                disabled={askConfirmRemoveStoredCard}
              >
                {i18n(configuration.locale, "stored-cards.removeStoredCard")}
              </button>
            </div>
          )}
      </span>
      <div
        className={`${"straumur__stored-card-component__confirm-remove-stored-card"} ${
          askConfirmRemoveStoredCard ? "straumur__stored-card-component__confirm-remove-stored-card--expanded" : ""
        }`}
      >
        <div className="straumur__stored-card-component__confirm-remove-stored-card--header">
          <WarningIcon />
          <span className="straumur__stored-card-component__confirm-remove-stored-card--header--title">
            {i18n(configuration.locale, "stored-cards.removeStoredCardQuestion")}
          </span>
        </div>
        <div className="straumur__stored-card-component__confirm-remove-stored-card--actions">
          <button
            className="straumur__stored-card-component__confirm-remove-stored-card--actions--button"
            onClick={handleConfirmRemoveStoredCard}
          >
            {i18n(configuration.locale, "stored-cards.removeStoredCardQuestionYesRemove")}
          </button>
          <button
            className="straumur__stored-card-component__confirm-remove-stored-card--actions--button"
            onClick={handleCancelRemoveStoredCard}
          >
            {i18n(configuration.locale, "stored-cards.removeStoredCardQuestionCancel")}
          </button>
        </div>
      </div>
      <div
        className="straumur__stored-card-component__expandable"
        ref={storedCardElementRef}
        style={{
          height: threeDSecureActive ? "600px" : "auto",
          minWidth: threeDSecureActive ? "350px" : "auto",
        }}
      >
        {!isStoredCardInitialized[storedPaymentMethod.id] && (
          <div className="straumur__stored-card-component__loading-text">
            <LoaderIcon />
          </div>
        )}

        <div
          className="straumur__stored-card-component__form"
          style={{
            opacity: isStoredCardInitialized[storedPaymentMethod.id] ? 1 : 0,
            position: isStoredCardInitialized[storedPaymentMethod.id] ? "relative" : "absolute",
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <div className="straumur__stored-card-component__form--field-wrapper">
            <div className="straumur__stored-card-component__form--wrapper">
              <label className="straumur__stored-card-component__form--wrapper--label straumur__stored-card-component__form--wrapper--label--readonly">
                {i18n(configuration.locale, "stored-cards.expiryDate")}
              </label>
              <span className="straumur__stored-card-component__form--wrapper--input straumur__stored-card-component__form--wrapper--input--readonly">
                {storedPaymentMethod.expiryMonth}/{storedPaymentMethod.expiryYear}
              </span>
            </div>

            <div className="straumur__stored-card-component__form--wrapper">
              {(securityCodePolicy === "optional" || securityCodePolicy === "required") && (
                <Fragment>
                  <label
                    className={`${"straumur__stored-card-component__form--wrapper--label"} ${
                      formErrors.encryptedSecurityCode.visible
                        ? "straumur__stored-card-component__form--wrapper--label--error"
                        : ""
                    }`}
                  >
                    {securityCodePolicy === "optional"
                      ? i18n(configuration.locale, "stored-cards.securityCode3DigitsOptional")
                      : i18n(configuration.locale, "stored-cards.securityCode3Digits")}
                  </label>
                  <span
                    className={`${"straumur__stored-card-component__form--wrapper--input"} ${
                      formErrors.encryptedSecurityCode.visible
                        ? "straumur__stored-card-component__form--wrapper--input--error"
                        : ""
                    }`}
                    data-cse="encryptedSecurityCode"
                  >
                    <div className="straumur__stored-card-component__form--wrapper--label--info">
                      <Tooltip content={i18n(configuration.locale, "stored-cards.securityCode3DigitsInfo")}>
                        <InfoIcon />
                      </Tooltip>
                    </div>
                  </span>
                </Fragment>
              )}
              {formErrors.encryptedSecurityCode.visible && (
                <span className="straumur__stored-card-component__form--wrapper--error">
                  {formErrors.encryptedSecurityCode.message}
                </span>
              )}
            </div>
          </div>

          <button
            className="straumur__stored-card-component__submit-button"
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

export default StoredCardComponent;
