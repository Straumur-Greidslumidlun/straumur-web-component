import { h, ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
  SubmitApi,
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

describe("PaymentMethodGroup submit handler registry", () => {
  function Registrar({ handler }: { handler: () => void }) {
    const { registerSubmitHandler, unregisterSubmitHandler } = usePaymentMethodGroup();
    useEffect(() => {
      registerSubmitHandler(handler);
      return () => unregisterSubmitHandler(handler);
    }, [handler]);
    return null;
  }

  function wrapWithApi(children: ComponentChildren) {
    let api: SubmitApi | undefined;
    const result = render(
      <PaymentMethodGroupContext {...(makeGroupProps() as any)} onSubmitApiReady={(a) => (api = a)}>
        {children}
      </PaymentMethodGroupContext>
    );
    return { getApi: () => api!, unmount: result.unmount };
  }

  it("hands out a triggerSubmit api via onSubmitApiReady", () => {
    const { getApi } = wrapWithApi(null);
    expect(typeof getApi().triggerSubmit).toBe("function");
  });

  it("triggerSubmit calls the currently registered handler and returns true", () => {
    const handler = vi.fn();
    const { getApi } = wrapWithApi(<Registrar handler={handler} />);

    expect(getApi().triggerSubmit()).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("triggerSubmit returns false when nothing is registered", () => {
    const { getApi } = wrapWithApi(null);
    expect(getApi().triggerSubmit()).toBe(false);
  });

  it("unregister only clears the handler if the identity matches, so an outgoing form can't clobber an incoming one", () => {
    let api: SubmitApi | undefined;
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    function Scenario() {
      const { registerSubmitHandler, unregisterSubmitHandler } = usePaymentMethodGroup();
      useEffect(() => {
        registerSubmitHandler(handlerA);
        // Simulate the previously-active form's cleanup running after handlerA already took over.
        unregisterSubmitHandler(handlerB);
      }, []);
      return null;
    }

    render(
      <PaymentMethodGroupContext {...(makeGroupProps() as any)} onSubmitApiReady={(a) => (api = a)}>
        <Scenario />
      </PaymentMethodGroupContext>
    );

    expect(api!.triggerSubmit()).toBe(true);
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
  });

  it("unregistering the active handler (e.g. on unmount) clears it", () => {
    const handler = vi.fn();
    const { getApi, unmount } = wrapWithApi(<Registrar handler={handler} />);
    expect(getApi().triggerSubmit()).toBe(true);

    unmount();
    expect(getApi().triggerSubmit()).toBe(false);
    // Only one call recorded from before the unmount.
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
