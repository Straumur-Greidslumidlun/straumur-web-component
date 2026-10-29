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
  const expanded = isSole || isActive;

  const header = (
    <span className="straumur__payment-method-item__content">
      {!isSole && <span className="straumur__payment-method-item--circle" />}
      {icon}
      <span className="straumur__payment-method-item--title">{title}</span>
    </span>
  );

  // Only the radio + header are inside the <label>. The form (card fields, pay button, store-consent
  // checkbox) and headerRight (e.g. the stored card's Remove button) must NOT be: in sole mode there is
  // no radio, so a label's control becomes its first labelable descendant and a click on the title or
  // blank space would be forwarded to that control — submitting the payment or removing the card.
  // Nesting the form also nested the checkbox's own <label> (invalid) and folded the whole form's text
  // into the radio's accessible name.
  return (
    <div
      className={`straumur__payment-method-item${isSole ? " straumur__payment-method-item--sole" : ""}${
        isActive ? " straumur__payment-method-item--active" : ""
      }`}
      // Keep the whole collapsed tile clickable (it used to be one big label); the radio stays the
      // keyboard/AT control.
      onClick={!isSole && !isActive && !paymentInProgress ? onChange : undefined}
    >
      <div
        className={`straumur__payment-method-item__header${
          expanded ? " straumur__payment-method-item__header--expanded" : ""
        }`}
      >
        {isSole ? (
          <div className="straumur__payment-method-item__label">{header}</div>
        ) : (
          <label className="straumur__payment-method-item__label">
            <input
              type="radio"
              className="straumur__payment-method-item__radio-selector"
              checked={isActive}
              onChange={onChange}
              disabled={paymentInProgress}
            />
            {header}
          </label>
        )}
        {headerRight}
      </div>
      {confirmSection}
      <div
        className={`straumur__payment-method-item__expandable${
          expanded ? " straumur__payment-method-item__expandable--visible" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default PaymentMethodItem;
