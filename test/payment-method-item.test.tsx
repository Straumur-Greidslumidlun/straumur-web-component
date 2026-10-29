import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import PaymentMethodItem from "../src/components/payment-method-item/payment-method-item";
import { PaymentMethodGroupContext } from "../src/components/payment-method-group/payment-method-group-context";

function renderItem(props: { isSole: boolean; isActive: boolean; onChange?: () => void; onPay?: () => void }) {
  const onPay = props.onPay ?? vi.fn();
  const onChange = props.onChange ?? vi.fn();
  render(
    <PaymentMethodGroupContext
      initialValue="card"
      isSolePaymentMethod={props.isSole}
      hasCard={true}
      hasGooglePay={false}
      hasApplePay={false}
      hasKortalan={false}
      hasStoredPaymentMethods={false}
    >
      <PaymentMethodItem
        icon={<span />}
        title="Card payment"
        isActive={props.isActive}
        isSole={props.isSole}
        onChange={onChange}
        headerRight={<button onClick={vi.fn()}>Remove</button>}
      >
        <label>
          <input type="checkbox" data-testid="consent" />
          Store
        </label>
        <button onClick={onPay}>Pay</button>
      </PaymentMethodItem>
    </PaymentMethodGroupContext>
  );
  return { onPay, onChange };
}

describe("PaymentMethodItem", () => {
  it("sole mode: clicking the title or tile does not forward to the pay button, checkbox or Remove", () => {
    const { onPay } = renderItem({ isSole: true, isActive: true });
    const consent = screen.getByTestId("consent") as HTMLInputElement;

    fireEvent.click(screen.getByText("Card payment"));

    expect(onPay).not.toHaveBeenCalled();
    expect(consent.checked).toBe(false);
    // No label wraps the form, so the form's controls are never a label's forwarded control.
    expect(screen.getByText("Pay").closest("label")).toBeNull();
    expect(screen.getByText("Remove").closest("label")).toBeNull();
  });

  it("radio mode: the radio's accessible name is only the header, not the form", () => {
    renderItem({ isSole: false, isActive: true });

    expect(screen.getByRole("radio").closest("label")?.textContent).toBe("Card payment");
  });

  it("radio mode: clicking anywhere on a collapsed tile selects it", () => {
    const { onChange } = renderItem({ isSole: false, isActive: false });

    fireEvent.click(screen.getByText("Pay"));

    expect(onChange).toHaveBeenCalled();
  });

  it.each([
    { isSole: false, isActive: false, visible: false },
    { isSole: false, isActive: true, visible: true },
    { isSole: true, isActive: true, visible: true },
  ])("expanded state for %o", ({ isSole, isActive, visible }) => {
    renderItem({ isSole, isActive });
    const expandable = document.querySelector(".straumur__payment-method-item__expandable")!;
    expect(expandable.classList.contains("straumur__payment-method-item__expandable--visible")).toBe(visible);
  });
});
