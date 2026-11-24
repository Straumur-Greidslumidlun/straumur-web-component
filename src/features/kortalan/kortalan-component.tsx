import { h } from "preact";
import "./kortalan-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";
import KortalanIcon from "../../assets/icons/kortalan";
import KortalanInstantCard from "./kortalan-instant-card";
import StraumurKortalanLogo from "../../assets/icons/straumur-kortalan-logo";
import { KORTALAN_TYPE, useKortalanPay } from "./use-kortalan-pay";

interface KortalanComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function KortalanComponent({ configuration }: KortalanComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isObscuredByThreeDS,
    isSolePaymentMethod,
    hasKortalan,
    paymentInProgress,
  } = usePaymentMethodGroup();
  const { pay, isSubmitting } = useKortalanPay(configuration);

  if (!hasKortalan) {
    return null;
  }

  if (isObscuredByThreeDS(KORTALAN_TYPE)) {
    return null;
  }

  // One-click card instead of a radio row: when the merchant lists Kortalán in instantPayments, or when
  // it is the only payment method and there is nothing to choose between.
  const isInstant = configuration.instantPayments?.some((x) => x === KORTALAN_TYPE) ?? false;

  if (isInstant || isSolePaymentMethod) {
    return <KortalanInstantCard configuration={configuration} />;
  }

  return (
    <PaymentMethodItem
      icon={<KortalanIcon />}
      title={i18n.t("kortalan.title")}
      isActive={activePaymentMethod === KORTALAN_TYPE}
      isSole={isSolePaymentMethod}
      logger={configuration.logger}
      paymentMethod={KORTALAN_TYPE}
      onChange={() => setActivePaymentMethod(KORTALAN_TYPE)}
      headerRight={
        <span className="straumur__kortalan-component__logo">
          <StraumurKortalanLogo />
        </span>
      }
    >
      <button
        className="straumur__kortalan-component__submit-button"
        disabled={isSubmitting || paymentInProgress}
        onClick={() => void pay()}
      >
        {i18n.t("kortalan.payButton")}
      </button>
    </PaymentMethodItem>
  );
}

export default KortalanComponent;
