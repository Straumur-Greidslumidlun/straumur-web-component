import { Fragment, h } from "preact";
import { useRef, useState, useEffect, StateUpdater, Dispatch } from "preact/hooks";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";
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
import { useI18n } from "../../localizations/i18n-context";
import { Tooltip } from "../tooltip/tooltip";
import InfoIcon from "../../assets/icons/info";
import { BrandHidden } from "../../utils/renderBrandIcons";
import LoaderIcon from "../../assets/icons/loader";
import CheckmarkIcon from "../../assets/icons/checkmark";
import { RenderDualBrandComponent, DualBrandConfiguration } from "../render-dual-brand/render-dual-brand";
import { ICreateDetailsBody, ICreatePaymentBody } from "../../adapter/models";
import { createDetailsRequest, createPaymentRequest } from "../../adapter/straumur-adapter";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";

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

  const hasCardPaymentMethod = paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "scheme");

  const {
    activePaymentMethod,
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
      locale: configuration.locale,
      countryCode: "IS",
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

  if (paymentMethods.paymentMethods?.paymentMethods?.length === 0) {
    return null;
  }

  function dualBrandListener(e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) {
    customCardRef.current!.dualBrandingChangeHandler(e);
  }

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
    configuration.onPaymentCompleted?.({ resultCode: data.resultCode });
  }

  function handlePaymentFailed(data?: PaymentFailedData | undefined, _?: UIElement<UIElementProps> | undefined): void {
    if (data) {
      if (data.resultCode === "Authorised") {
        handleSuccess("success.paymentAuthorized");
      } else {
        handleError("error.paymentUnsuccessful");
      }

      configuration.onPaymentFailed?.({ resultCode: data.resultCode });
    } else {
      configuration.onPaymentFailed?.();
    }
  }

  function handleSubmitClick() {
    if (!customCardRef.current) return;

    customCardRef.current!.submit();
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

        <button
          className="straumur__card-component__submit-button"
          disabled={payButtonDisabled}
          onClick={handleSubmitClick}
        >
          {paymentMethods.formattedAmount}
        </button>
      </div>
    </div>
  );
}

export default CardForm;
