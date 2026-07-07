import { h } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { makeGroupProps } from "./helpers/fixtures";

function Probe() {
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isPaymentMethodInitialized,
    updatePaymentMethodInitialization,
    isStoredCardInitialized,
    updateStoredCardInitialization,
    threeDSecureActive,
    setThreeDSecureActive,
  } = usePaymentMethodGroup();

  return (
    <div>
      <span data-testid="active">{String(activePaymentMethod)}</span>
      <span data-testid="card-init">{String(isPaymentMethodInitialized.card)}</span>
      <span data-testid="stored-init">{String(isStoredCardInitialized["s1"] ?? false)}</span>
      <span data-testid="tds">{String(threeDSecureActive)}</span>
      <button data-testid="set-active" onClick={() => setActivePaymentMethod("card")} />
      <button data-testid="init-card" onClick={() => updatePaymentMethodInitialization("card", true)} />
      <button data-testid="init-stored" onClick={() => updateStoredCardInitialization("s1", true)} />
      <button data-testid="set-tds" onClick={() => setThreeDSecureActive(true)} />
    </div>
  );
}

function wrap(initial: Record<string, unknown> = {}) {
  return render(
    <PaymentMethodGroupContext {...(makeGroupProps(initial) as any)}>
      <Probe />
    </PaymentMethodGroupContext>
  );
}

describe("PaymentMethodGroup context", () => {
  it("throws when used outside the provider", () => {
    // Preact logs the error; suppress and assert the render throws.
    expect(() => render(<Probe />)).toThrow(/usePaymentMethodGroup must be used within/);
  });

  it("seeds activePaymentMethod from initialValue", () => {
    wrap({ initialValue: "googlepay" });
    expect(screen.getByTestId("active").textContent).toBe("googlepay");
  });

  it("updates the active payment method", () => {
    wrap();
    expect(screen.getByTestId("active").textContent).toBe("null");
    fireEvent.click(screen.getByTestId("set-active"));
    expect(screen.getByTestId("active").textContent).toBe("card");
  });

  it("tracks per-method initialization flags", () => {
    wrap();
    expect(screen.getByTestId("card-init").textContent).toBe("false");
    fireEvent.click(screen.getByTestId("init-card"));
    expect(screen.getByTestId("card-init").textContent).toBe("true");
  });

  it("tracks per-stored-card initialization flags", () => {
    wrap();
    expect(screen.getByTestId("stored-init").textContent).toBe("false");
    fireEvent.click(screen.getByTestId("init-stored"));
    expect(screen.getByTestId("stored-init").textContent).toBe("true");
  });

  it("toggles the 3-D Secure flag", () => {
    wrap();
    fireEvent.click(screen.getByTestId("set-tds"));
    expect(screen.getByTestId("tds").textContent).toBe("true");
  });
});
