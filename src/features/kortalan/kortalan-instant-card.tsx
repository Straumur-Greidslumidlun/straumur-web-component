import { h } from "preact";
import "./kortalan-instant-card.css";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { useI18n } from "../../localizations/i18n-context";
import KortalanStandaloneButton from "./kortalan-standalone-button";

interface KortalanInstantCardProps {
  configuration: StraumurCheckoutConfiguration;
}

/**
 * Kortalán as a one-click option: its own card with a heading and the branded button, no radio row
 * (Figma "Straumur Kortalán - Button v03", node 2635:3021). Used when Kortalán is in `instantPayments`
 * or is the widget's only payment method. It never joins the Google Pay / Apple Pay express row; it
 * renders in the "kortalan" slot of `orderPaymentMethods`.
 */
function KortalanInstantCard({ configuration }: KortalanInstantCardProps): h.JSX.Element {
  const { i18n } = useI18n();

  return (
    <div className="straumur__kortalan-instant-card">
      <p className="straumur__kortalan-instant-card__title">{i18n.t("kortalan.instantTitle")}</p>
      <KortalanStandaloneButton configuration={configuration} />
    </div>
  );
}

export default KortalanInstantCard;
