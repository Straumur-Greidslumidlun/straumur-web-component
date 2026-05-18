import { h } from "preact";
import { useState } from "preact/hooks";
import "./card-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { useI18n } from "../../localizations/i18n-context";
import CardIcon from "../../assets/icons/card";
import { BrandHidden, RenderBrandIcons } from "../../utils/renderBrandIcons";
import { CardComponentProps } from "./models";
import CardForm from "../../components/card-form/card-form";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";

function CardComponent({ configuration, paymentMethods }: CardComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const [brandHidden, setBrandHidden] = useState<BrandHidden[]>([]);
  const { activePaymentMethod, setActivePaymentMethod, threeDSecureActive, isSolePaymentMethod, hasCard } =
    usePaymentMethodGroup();

  if (!hasCard || (activePaymentMethod !== "card" && threeDSecureActive)) {
    return null;
  }

  const schemeBrands = paymentMethods.paymentMethods.paymentMethods!.find((x) => x.type === "scheme")!.brands!;

  const brands = schemeBrands.map((x) => {
    return { brand: x, brandFullName: x };
  });

  return (
    <PaymentMethodItem
      icon={<CardIcon />}
      title={i18n.t("cards.title")}
      isActive={activePaymentMethod === "card"}
      isSole={isSolePaymentMethod}
      onChange={() => setActivePaymentMethod("card")}
      headerRight={
        <span className="straumur__card-component--brands">
          <RenderBrandIcons brands={brands} brandHidden={brandHidden} />
        </span>
      }
    >
      <CardForm configuration={configuration} paymentMethods={paymentMethods} onBrandHidden={setBrandHidden} />
    </PaymentMethodItem>
  );
}

export default CardComponent;
