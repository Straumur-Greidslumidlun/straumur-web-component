import { h, Fragment } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/preact";

const A = vi.hoisted(() => {
  const cap: any = { gpayAvailable: true, apayAvailable: true };
  class FakeGooglePay {
    mount = vi.fn();
    remove = vi.fn();
    constructor(_c: unknown, _o: any) {}
    isAvailable() {
      return cap.gpayAvailable ? Promise.resolve() : Promise.reject(new Error("na"));
    }
  }
  class FakeApplePay {
    mount = vi.fn();
    remove = vi.fn();
    constructor(_c: unknown, _o: any) {}
    isAvailable() {
      return cap.apayAvailable ? Promise.resolve() : Promise.reject(new Error("na"));
    }
  }
  return { cap, FakeGooglePay, FakeApplePay };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({})),
  CustomCard: class {},
  GooglePay: A.FakeGooglePay,
  ApplePay: A.FakeApplePay,
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import GooglePayComponent from "../src/features/google-pay/google-pay-component";
import InstantPaymentsComponent from "../src/features/instantPayments/instant-payments-component";
import { usePaymentMethodGroup } from "../src/components/payment-method-group/payment-method-group-context";
import { renderInGroup, baseConfig, makePaymentMethods, googlePayMethod, applePayMethod } from "./helpers/fixtures";

const gpayMethods = makePaymentMethods({ paymentMethods: { paymentMethods: [googlePayMethod()] } });

function ActivateTds() {
  const { setThreeDSecureActive } = usePaymentMethodGroup();
  return <button data-testid="tds" onClick={() => setThreeDSecureActive(true)} />;
}

beforeEach(() => {
  A.cap.gpayAvailable = true;
  A.cap.apayAvailable = true;
});

describe("GooglePayComponent gating", () => {
  it("renders nothing when Google Pay is not available in the response", () => {
    renderInGroup(<GooglePayComponent configuration={baseConfig()} paymentMethods={gpayMethods} />, {
      hasGooglePay: false,
    });
    expect(screen.queryByText("Google Pay")).toBeNull();
  });

  it("renders nothing when Google Pay is configured as an instant payment", () => {
    renderInGroup(
      <GooglePayComponent
        configuration={baseConfig({ instantPayments: ["googlepay"] })}
        paymentMethods={gpayMethods}
      />,
      { hasGooglePay: true }
    );
    expect(screen.queryByText("Google Pay")).toBeNull();
  });

  it("renders the Google Pay option when available", () => {
    renderInGroup(<GooglePayComponent configuration={baseConfig()} paymentMethods={gpayMethods} />, {
      hasGooglePay: true,
    });
    expect(screen.getByText("Google Pay")).toBeTruthy();
  });

  it("hides itself once the wallet reports it is unavailable", async () => {
    A.cap.gpayAvailable = false;
    renderInGroup(<GooglePayComponent configuration={baseConfig()} paymentMethods={gpayMethods} />, {
      hasGooglePay: true,
    });
    await waitFor(() => expect(screen.queryByText("Google Pay")).toBeNull());
  });

  it("hides itself when 3-D Secure activates for another method", async () => {
    renderInGroup(
      <Fragment>
        <ActivateTds />
        <GooglePayComponent configuration={baseConfig()} paymentMethods={gpayMethods} />
      </Fragment>,
      { hasGooglePay: true, initialValue: null }
    );
    expect(screen.getByText("Google Pay")).toBeTruthy();
    fireEvent.click(screen.getByTestId("tds"));
    await waitFor(() => expect(screen.queryByText("Google Pay")).toBeNull());
  });
});

describe("InstantPaymentsComponent", () => {
  it("renders nothing when instantPayments is not configured", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent configuration={baseConfig()} paymentMethods={gpayMethods} />,
      { hasGooglePay: true }
    );
    expect(container.querySelector(".instant-payments")).toBeNull();
  });

  it("renders nothing when the configured instant method is not available in the response", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["googlepay"] })}
        paymentMethods={gpayMethods}
      />,
      { hasGooglePay: false }
    );
    expect(container.querySelector(".instant-payments")).toBeNull();
  });

  it("renders the instant-payments wrapper for a configured, available method", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["googlepay"] })}
        paymentMethods={gpayMethods}
      />,
      { hasGooglePay: true }
    );
    expect(container.querySelector(".instant-payments")).toBeTruthy();
  });

  it("filters out invalid entries and keeps only available wallets", () => {
    const bothMethods = makePaymentMethods({
      paymentMethods: { paymentMethods: [googlePayMethod(), applePayMethod()] },
    });
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["applepay", "googlepay"] })}
        paymentMethods={bothMethods}
      />,
      { hasGooglePay: true, hasApplePay: false }
    );
    // apple pay filtered (not available), google pay kept -> single-layout wrapper present.
    const wrapper = container.querySelector(".instant-payments");
    expect(wrapper).toBeTruthy();
    expect(wrapper!.className).toContain("instant-payments--single");
  });
});
