import { h, Fragment } from "preact";
import { ResultMessage } from "../src/models/models";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/preact";

/** Capture store for the wallet onSubmit and the AdyenCheckout result callbacks. */
const A = vi.hoisted(() => {
  const cap: any = { checkout: [], wallet: [] };
  class FakeWallet {
    mount = vi.fn();
    remove = vi.fn();
    constructor(_core: unknown, config: any) {
      cap.wallet.push(config);
    }
    isAvailable() {
      return Promise.resolve();
    }
  }
  return { cap, FakeWallet };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    A.cap.checkout.push(config);
    return {};
  }),
  CustomCard: class {},
  GooglePay: A.FakeWallet,
  ApplePay: A.FakeWallet,
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import GooglePayButton from "../src/components/google-pay-button/google-pay-button";
import ApplePayButton from "../src/components/apple-pay-button/apple-pay-button";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { createPaymentRequest } from "../src/adapter/straumur-adapter";
import { baseConfig, makePaymentMethods, googlePayMethod, applePayMethod } from "./helpers/fixtures";

const createPayment = vi.mocked(createPaymentRequest);
const paymentMethods = makePaymentMethods({
  paymentMethods: { paymentMethods: [googlePayMethod(), applePayMethod()] },
});

const messageText = (message: ResultMessage | null) =>
  message === null ? String(message) : "key" in message ? message.key : message.text;

function Probe() {
  const { activePaymentMethod, threeDSecureActive, error, success } = usePaymentMethodGroup();
  return (
    <Fragment>
      <span data-testid="active">{String(activePaymentMethod)}</span>
      <span data-testid="tds">{String(threeDSecureActive)}</span>
      <span data-testid="error">{messageText(error)}</span>
      <span data-testid="success">{messageText(success)}</span>
    </Fragment>
  );
}

const actions = () => ({ resolve: vi.fn(), reject: vi.fn() });
const submitState = { data: { paymentMethod: { type: "wallet" } } };

beforeEach(() => {
  A.cap.checkout.length = 0;
  A.cap.wallet.length = 0;
  createPayment.mockReset();
});

const wallets = [
  { name: "GooglePayButton", Comp: GooglePayButton, method: "googlepay" },
  { name: "ApplePayButton", Comp: ApplePayButton, method: "applepay" },
] as const;

wallets.forEach(({ name, Comp, method }) => {
  describe(`${name} payment flow`, () => {
    async function setup(config = baseConfig(), isInstantPayment = false) {
      render(
        <I18nProvider i18nService={new I18nService("en-US")}>
          <PaymentMethodGroupContext
            initialValue={null}
            isSolePaymentMethod={false}
            hasCard={false}
            hasGooglePay={true}
            hasApplePay={true}
            hasStoredPaymentMethods={false}
          >
            <Probe />
            <Comp
              configuration={config}
              paymentMethods={paymentMethods}
              isInstantPayment={isInstantPayment}
              onUnavailable={() => {}}
            />
          </PaymentMethodGroupContext>
        </I18nProvider>
      );
      await waitFor(() => expect(A.cap.wallet.length).toBeGreaterThan(0));
      await waitFor(() => expect(A.cap.checkout.length).toBeGreaterThan(0));
      return { onSubmit: A.cap.wallet[0].onSubmit, checkout: A.cap.checkout[0] };
    }

    it("posts the payment with sessionId and resolves on Authorised", async () => {
      createPayment.mockResolvedValue({
        ok: true,
        json: async () => ({ resultCode: "Authorised", action: null }),
      } as any);
      const { onSubmit } = await setup();
      const act1 = actions();

      await act(async () => {
        await onSubmit(submitState, {}, act1);
      });

      expect(createPayment).toHaveBeenCalledWith("test", expect.objectContaining({ sessionId: "s1" }));
      expect(act1.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: null });
      expect(act1.reject).not.toHaveBeenCalled();
    });

    it("marks itself active when submitted as an instant payment", async () => {
      createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "Authorised" }) } as any);
      const { onSubmit } = await setup(baseConfig(), true);

      await act(async () => {
        await onSubmit(submitState, {}, actions());
      });

      await waitFor(() => expect(screen.getByTestId("active").textContent).toBe(method));
    });

    it("activates 3-D Secure on ChallengeShopper", async () => {
      createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "ChallengeShopper" }) } as any);
      const { onSubmit } = await setup(baseConfig(), true);

      await act(async () => {
        await onSubmit(submitState, {}, actions());
      });

      await waitFor(() => expect(screen.getByTestId("tds").textContent).toBe("true"));
    });

    it("rejects and surfaces an error when the request is not ok", async () => {
      createPayment.mockResolvedValue({ ok: false, json: async () => ({}) } as any);
      const { onSubmit } = await setup();
      const act1 = actions();

      await act(async () => {
        await onSubmit(submitState, {}, act1);
      });

      expect(act1.reject).toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.failedToSubmitPayment"));
    });

    it("rejects with paymentFailed when the response has no resultCode", async () => {
      createPayment.mockResolvedValue({ ok: true, json: async () => ({}) } as any);
      const { onSubmit } = await setup();
      const act1 = actions();

      await act(async () => {
        await onSubmit(submitState, {}, act1);
      });

      expect(act1.reject).toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.paymentFailed"));
    });

    it("fires onPaymentCompleted and shows success on Authorised", async () => {
      const onPaymentCompleted = vi.fn();
      const { checkout } = await setup(baseConfig({ onPaymentCompleted }));

      await act(async () => {
        checkout.onPaymentCompleted({ resultCode: "Authorised" });
      });

      expect(onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
      await waitFor(() => expect(screen.getByTestId("success").textContent).toBe("success.paymentAuthorized"));
    });

    it("fires onPaymentFailed with a synthesized Error resultCode when called without data", async () => {
      const onPaymentFailed = vi.fn();
      const { checkout } = await setup(baseConfig({ onPaymentFailed }));

      await act(async () => {
        checkout.onPaymentFailed(undefined);
      });

      expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Error" });
    });

    it("reports unavailable instead of crashing when the wallet has no configuration", async () => {
      const onUnavailable = vi.fn();
      const methodsWithoutConfig = makePaymentMethods({
        paymentMethods: { paymentMethods: [{ type: method, name }] },
      });

      render(
        <I18nProvider i18nService={new I18nService("en-US")}>
          <PaymentMethodGroupContext
            initialValue={null}
            isSolePaymentMethod={false}
            hasCard={false}
            hasGooglePay={true}
            hasApplePay={true}
            hasStoredPaymentMethods={false}
          >
            <Comp
              configuration={baseConfig()}
              paymentMethods={methodsWithoutConfig}
              isInstantPayment={false}
              onUnavailable={onUnavailable}
            />
          </PaymentMethodGroupContext>
        </I18nProvider>
      );

      await waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1));
      expect(A.cap.wallet.length).toBe(0);
    });
  });
});
