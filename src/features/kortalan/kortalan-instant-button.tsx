import { h } from "preact";
import "./kortalan-instant-button.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { useI18n } from "../../localizations/i18n-context";
import KortalanIcon from "../../assets/icons/kortalan";
import { KORTALAN_TYPE, useKortalanPay } from "./use-kortalan-pay";

interface KortalanInstantButtonProps {
  configuration: StraumurCheckoutConfiguration;
}

/**
 * The Kortalán express button rendered inside the instant-payments strip. Unlike the Adyen wallets it
 * is not an Adyen element — it triggers the same native redirect flow as the standalone Kortalán row
 * (via useKortalanPay). Availability is decided by the instant strip; this only self-guards against a
 * 3-D Secure takeover by another method.
 */
function KortalanInstantButton({ configuration }: KortalanInstantButtonProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { isObscuredByThreeDS, paymentInProgress } = usePaymentMethodGroup();
  const { pay, isSubmitting } = useKortalanPay(configuration);

  if (isObscuredByThreeDS(KORTALAN_TYPE)) {
    return null;
  }

  return (
    <button
      className="straumur__kortalan-instant-button"
      disabled={isSubmitting || paymentInProgress}
      onClick={() => void pay()}
    >
      <KortalanIcon />
      <span>{i18n.t("kortalan.payButton")}</span>
    </button>
  );
}

export default KortalanInstantButton;
