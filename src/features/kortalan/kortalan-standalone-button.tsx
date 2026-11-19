import { h } from "preact";
import "./kortalan-standalone-button.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { useI18n } from "../../localizations/i18n-context";
import StraumurSymbol from "../../assets/icons/straumur-symbol";
import { KORTALAN_TYPE, useKortalanPay } from "./use-kortalan-pay";

interface KortalanStandaloneButtonProps {
  configuration: StraumurCheckoutConfiguration;
}

/**
 * Kortalán's branded one-click button (Figma nodes 2253:2713 and 2635:3047), shown inside
 * KortalanInstantCard when Kortalán is in `instantPayments` or is the only payment method. It
 * triggers the same native redirect flow as the row (via useKortalanPay).
 *
 * The button has one fixed brand appearance and takes no theme input: like the Google Pay / Apple Pay
 * buttons, its colors belong to the provider, so the widget theme never restyles it.
 */
function KortalanStandaloneButton({ configuration }: KortalanStandaloneButtonProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { isObscuredByThreeDS, paymentInProgress } = usePaymentMethodGroup();
  const { pay, isSubmitting } = useKortalanPay(configuration);

  if (isObscuredByThreeDS(KORTALAN_TYPE)) {
    return null;
  }

  return (
    <button
      className="straumur__kortalan-standalone-button"
      disabled={isSubmitting || paymentInProgress}
      onClick={() => void pay()}
    >
      <StraumurSymbol />
      <span>{i18n.t("kortalan.brandButton")}</span>
    </button>
  );
}

export default KortalanStandaloneButton;
