import { Fragment, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import "./stored-card-component.css";
import { useI18n } from "../../localizations/i18n-context";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { Tooltip } from "../../components/tooltip/tooltip";
import InfoIcon from "../../assets/icons/info";
import { AdyenCheckout, AdyenCheckoutError, CustomCard, ICore, UIElement, UIElementProps } from "@adyen/adyen-web";
import { RenderBrandIcons } from "../../utils/renderBrandIcons";
import LoaderIcon from "../../assets/icons/loader";
import { StoredCardComponentProps, StoredCardFormError, StoredCardFormErrorField } from "./models";
import WarningIcon from "../../assets/icons/warning";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";
import { createAdyenPaymentHandlers } from "../../components/shared/create-adyen-handlers";
import { submitCardWithGate } from "../../components/shared/before-submit-click";
import { useAdyenLocaleReinit } from "../../utils/custom-hooks/use-adyen-locale-reinit";
import { toResultMessage } from "../../flows/payment-flow";

function StoredCardComponent({
  configuration,
  paymentMethods,
  storedPaymentMethod,
  onStoredCardRemoved,
}: StoredCardComponentProps): h.JSX.Element | null {
  const storedCardElementRef = useRef<HTMLDivElement>(null);
  const adyenCheckoutRef = useRef<ICore>();
  const customCardRef = useRef<CustomCard>();
  const { i18n } = useI18n();
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
    isSolePaymentMethod,
    registerSubmitHandler,
    unregisterSubmitHandler,
  } = usePaymentMethodGroup();

  // In sole mode there is only one stored card, so being the active payment method is enough.
  // In normal mode both the method and the specific card ID must match.
  const isActive = isSolePaymentMethod
    ? activePaymentMethod === "storedcard"
    : activePaymentMethod === "storedcard" && activeStoredPaymentMethodId === storedPaymentMethod.id;

  async function handleSubmitClick(): Promise<void> {
    await submitCardWithGate(configuration.paymentFlow, () => customCardRef.current);
  }

  useEffect(() => {
    const ready = isActive && isStoredCardInitialized[storedPaymentMethod.id];
    if (!ready) {
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
  }, [isActive, isStoredCardInitialized[storedPaymentMethod.id], registerSubmitHandler, unregisterSubmitHandler]);

  const { handleOnSubmit, handleOnSubmitAdditionalData, handlePaymentCompleted, handlePaymentFailed } =
    createAdyenPaymentHandlers({
      configuration,
      handleSuccess,
      handleError,
      setThreeDSecureActive,
      enrichSubmitData: (data) => ({
        ...data,
        paymentMethod: {
          ...data.paymentMethod,
          storedPaymentMethodId: storedPaymentMethod.id,
        },
      }),
    });

  function handleOnError(_: AdyenCheckoutError, __?: UIElement<UIElementProps> | undefined) {
    handleError({ key: "error.unknownError" });
  }

  const initializeAdyenComponent = async () => {
    adyenCheckoutRef.current = await AdyenCheckout({
      clientKey: paymentMethods.clientKey,
      environment: configuration.environment,
      locale: configuration.locale,
      countryCode: configuration.countryCode,
      amount: {
        value: paymentMethods.minorUnitsAmount,
        currency: paymentMethods.currency,
      },
      paymentMethodsResponse: paymentMethods.paymentMethods,
      onError: handleOnError,
      onAdditionalDetails: handleOnSubmitAdditionalData,
      onPaymentCompleted: handlePaymentCompleted,
      onPaymentFailed: handlePaymentFailed,
    });

    customCardRef.current = new CustomCard(adyenCheckoutRef.current, {
      brands: [storedPaymentMethod.brand!],
      onSubmit: handleOnSubmit,
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
        configuration.onCardValidityChanged?.(event.allValid, true);
      },
      placeholders: configuration.placeholders,
      // Adyen appears to ignore challengeWindowSize on CustomCard; kept for parity with the wallet configs.
      challengeWindowSize: "05",
    });

    if (storedCardElementRef.current) {
      customCardRef.current.mount(storedCardElementRef.current);
    }
  };

  useEffect(() => {
    if (isActive && !isStoredCardInitialized[storedPaymentMethod.id]) {
      initializeAdyenComponent();
    }
  }, [configuration, isActive]);

  useAdyenLocaleReinit(
    configuration,
    () => Boolean(customCardRef.current && isStoredCardInitialized[activeStoredPaymentMethodId!]),
    () => {
      initializeAdyenComponent();
      setFormErrors({ encryptedSecurityCode: { visible: false, message: undefined } });
    }
  );

  useEffect(() => {
    setAskConfirmRemoveStoredCard(false);
  }, [activePaymentMethod, activeStoredPaymentMethodId]);

  // Keep this guard below every hook call: returning early above a hook violates the
  // rules of hooks and corrupts hook ordering across renders.
  // Deliberately NOT isObscuredByThreeDS("storedcard"): several stored-card components can be
  // mounted at once, so the one running the 3DS challenge is matched by card id via isActive.
  if (threeDSecureActive && !isActive) {
    return null;
  }

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
    const { disableToken } = configuration.paymentFlow;

    if (!disableToken) return;

    try {
      await disableToken(storedPaymentMethod.id);
      onStoredCardRemoved(storedPaymentMethod.id);
    } catch (error) {
      handleError(toResultMessage(error, "error.failedToSubmitRemoveStoredPaymentCard"));
    }
  }

  const canRemoveStoredCard = configuration.paymentFlow.disableToken !== undefined;

  const headerRight =
    canRemoveStoredCard && isActive && isStoredCardInitialized[storedPaymentMethod.id] ? (
      <div className="straumur__stored-card-component__remove-stored-card-button">
        <button
          onClick={handleAskToConfirmRemoveCard}
          className="straumur__stored-card-component__remove-stored-card-button--text"
          disabled={askConfirmRemoveStoredCard}
        >
          {i18n.t("stored-cards.removeStoredCard")}
        </button>
      </div>
    ) : null;

  const confirmSection = (
    <div
      className={`${"straumur__stored-card-component__confirm-remove-stored-card"} ${
        askConfirmRemoveStoredCard ? "straumur__stored-card-component__confirm-remove-stored-card--expanded" : ""
      }`}
    >
      <div className="straumur__stored-card-component__confirm-remove-stored-card--header">
        <WarningIcon />
        <span className="straumur__stored-card-component__confirm-remove-stored-card--header--title">
          {i18n.t("stored-cards.removeStoredCardQuestion")}
        </span>
      </div>
      <div className="straumur__stored-card-component__confirm-remove-stored-card--actions">
        <button
          className="straumur__stored-card-component__confirm-remove-stored-card--actions--button"
          onClick={handleConfirmRemoveStoredCard}
        >
          {i18n.t("stored-cards.removeStoredCardQuestionYesRemove")}
        </button>
        <button
          className="straumur__stored-card-component__confirm-remove-stored-card--actions--button"
          onClick={handleCancelRemoveStoredCard}
        >
          {i18n.t("stored-cards.removeStoredCardQuestionCancel")}
        </button>
      </div>
    </div>
  );

  return (
    <PaymentMethodItem
      icon={
        <RenderBrandIcons
          brands={[
            {
              brand: storedPaymentMethod.brand!,
              brandFullName: storedPaymentMethod.name,
            },
          ]}
        />
      }
      title={`•••• ${storedPaymentMethod.lastFour}`}
      isActive={isActive}
      isSole={isSolePaymentMethod}
      onChange={handleBoxChange}
      headerRight={headerRight}
      confirmSection={confirmSection}
    >
      <div
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
            opacity: isStoredCardInitialized[storedPaymentMethod.id] && !threeDSecureActive ? 1 : 0,
            position: isStoredCardInitialized[storedPaymentMethod.id] && !threeDSecureActive ? "relative" : "absolute",
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <div className="straumur__stored-card-component__form--field-wrapper">
            <div className="straumur__stored-card-component__form--wrapper">
              <label className="straumur__stored-card-component__form--wrapper--label straumur__stored-card-component__form--wrapper--label--readonly">
                {i18n.t("stored-cards.expiryDate")}
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
                      ? i18n.t("stored-cards.securityCode3DigitsOptional")
                      : i18n.t("stored-cards.securityCode3Digits")}
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
                      <Tooltip content={i18n.t("stored-cards.securityCode3DigitsInfo")}>
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

          {!configuration.hideSubmitButton && (
            <button
              className="straumur__stored-card-component__submit-button"
              disabled={payButtonDisabled}
              onClick={handleSubmitClick}
            >
              {paymentMethods.minorUnitsAmount === 0
                ? i18n.t("stored-cards.saveCardDetails")
                : paymentMethods.formattedAmount}
            </button>
          )}
        </div>
      </div>
    </PaymentMethodItem>
  );
}

export default StoredCardComponent;
