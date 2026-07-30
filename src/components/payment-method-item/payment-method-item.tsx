import { h, ComponentChildren } from "preact";
import "./payment-method-item.css";
import { usePaymentMethodGroup } from "../payment-method-group/payment-method-group-context";

interface PaymentMethodItemProps {
  icon: h.JSX.Element;
  title: string;
  isActive: boolean;
  isSole: boolean;
  onChange: () => void;
  children: ComponentChildren;
  headerRight?: h.JSX.Element | null;
  confirmSection?: h.JSX.Element;
}

function PaymentMethodItem({
  icon,
  title,
  isActive,
  isSole,
  onChange,
  children,
  headerRight,
  confirmSection,
}: PaymentMethodItemProps): h.JSX.Element {
  // Prevent switching methods while a payment is in flight (the buttons are disabled too).
  const { paymentInProgress } = usePaymentMethodGroup();

  return (
    <label className={`straumur__payment-method-item${isSole ? " straumur__payment-method-item--sole" : ""}`}>
      {!isSole && (
        <input
          type="radio"
          className="straumur__payment-method-item__radio-selector"
          checked={isActive}
          onChange={onChange}
          disabled={paymentInProgress}
        />
      )}
      <span
        className={`straumur__payment-method-item__content${isSole ? " straumur__payment-method-item__content--expanded" : ""}`}
      >
        {!isSole && <span className="straumur__payment-method-item--circle" />}
        {icon}
        <span className="straumur__payment-method-item--title">{title}</span>
        {headerRight}
      </span>
      {confirmSection}
      <div
        className={`straumur__payment-method-item__expandable${isSole ? " straumur__payment-method-item__expandable--visible" : ""}`}
      >
        {children}
      </div>
    </label>
  );
}

export default PaymentMethodItem;
