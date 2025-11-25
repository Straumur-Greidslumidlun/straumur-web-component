import { h } from "preact";
import { useState } from "preact/hooks";
import "./card-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { useI18n } from "../../localizations/i18n-context";
import CardIcon from "../../assets/icons/card";
import { BrandHidden, RenderBrandIcons } from "../../utils/renderBrandIcons";
import { CardComponentProps } from "./models";
import CardForm from "../../components/card-form/card-form";

function CardComponent({ configuration, paymentMethods }: CardComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const [brandHidden, setBrandHidden] = useState<BrandHidden[]>([]);
  const { activePaymentMethod, setActivePaymentMethod, threeDSecureActive } = usePaymentMethodGroup();

  const hasCardPaymentMethod = paymentMethods.paymentMethods.paymentMethods?.some((x) => x.type === "scheme");

  if (!hasCardPaymentMethod || (activePaymentMethod !== "card" && threeDSecureActive)) {
    // if threeDSecureActive for some other payment method, do not show card form
    return null;
  }

  const schemeBrands = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "scheme")!.brands!;

  const brands = schemeBrands.map((x) => {
    return { brand: x, brandFullName: x };
  });

  const handleBoxChange = () => {
    setActivePaymentMethod("card");
  };

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
        <span className="straumur__card-component--text">{i18n.t("cards.title")}</span>
        <span className="straumur__card-component--brands">
          <RenderBrandIcons brands={brands} brandHidden={brandHidden} />
        </span>
      </span>
      <CardForm configuration={configuration} paymentMethods={paymentMethods} onBrandHidden={setBrandHidden} />
    </label>
  );
}

export default CardComponent;
