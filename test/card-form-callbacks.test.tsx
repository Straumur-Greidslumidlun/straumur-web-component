import { h, Fragment } from "preact";
import { ResultMessage } from "../src/models/models";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/preact";

/** Capture store for the Adyen callbacks CardForm wires up. */
const A = vi.hoisted(() => {
  const cap: any = { checkout: [], card: [] };
  class FakeCustomCard {
    mount = vi.fn();
    unmount = vi.fn();
    submit = vi.fn();
    dualBrandingChangeHandler = vi.fn();
    constructor(_core: unknown, opts: any) {
      cap.card.push(opts);
      opts.onConfigSuccess?.();
    }
  }
  return { cap, FakeCustomCard };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    A.cap.checkout.push(config);
    return {};
  }),
  CustomCard: A.FakeCustomCard,
  GooglePay: class {},
  ApplePay: class {},
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import CardForm from "../src/components/card-form/card-form";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { createPaymentRequest, createDetailsRequest } from "../src/adapter/straumur-adapter";
import { baseConfig, makePaymentMethods, scheme } from "./helpers/fixtures";

const createPayment = vi.mocked(createPaymentRequest);
const createDetails = vi.mocked(createDetailsRequest);

const paymentMethods = makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(["visa", "mc"])] } });

const messageText = (message: ResultMessage | null) =>
  message === null ? String(message) : "key" in message ? message.key : message.text;

function Probe() {
  const { threeDSecureActive, error, success } = usePaymentMethodGroup();
  return (
    <Fragment>
      <span data-testid="tds">{String(threeDSecureActive)}</span>
      <span data-testid="error">{messageText(error)}</span>
      <span data-testid="success">{messageText(success)}</span>
    </Fragment>
  );
}

async function setup(config = baseConfig()) {
  render(
    <I18nProvider i18nService={new I18nService("en-US")}>
      <PaymentMethodGroupContext
        initialValue="card"
        isSolePaymentMethod={true}
        hasCard={true}
        hasGooglePay={false}
        hasApplePay={false}
        hasStoredPaymentMethods={false}
      >
        <Probe />
        <CardForm configuration={config} paymentMethods={paymentMethods} onBrandHidden={() => {}} />
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
  await waitFor(() => expect(A.cap.checkout.length).toBeGreaterThan(0));
  return { onSubmit: A.cap.checkout[0].onSubmit, checkout: A.cap.checkout[0], card: A.cap.card[0] };
}

const actions = () => ({ resolve: vi.fn(), reject: vi.fn() });
const submitState = { data: { paymentMethod: { type: "scheme" } } };

beforeEach(() => {
  A.cap.checkout.length = 0;
  A.cap.card.length = 0;
  createPayment.mockReset();
  createDetails.mockReset();
});

describe("CardForm.handleOnSubmit", () => {
  it("posts the payment with sessionId + storePaymentMethod and resolves on Authorised", async () => {
    createPayment.mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: "Authorised", action: null }),
    } as any);
    const { onSubmit } = await setup();
    const act1 = actions();

    await act(async () => {
      await onSubmit(submitState, {}, act1);
    });

    expect(createPayment).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ sessionId: "s1", storePaymentMethod: false, paymentMethod: { type: "scheme" } })
    );
    expect(act1.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: null });
    expect(act1.reject).not.toHaveBeenCalled();
  });

  it("still resolves (does not reject) when the payment is Refused", async () => {
    createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "Refused", action: null }) } as any);
    const { onSubmit } = await setup();
    const act1 = actions();

    await act(async () => {
      await onSubmit(submitState, {}, act1);
    });

    expect(act1.resolve).toHaveBeenCalledWith({ resultCode: "Refused", action: null });
    expect(act1.reject).not.toHaveBeenCalled();
    expect(screen.getByTestId("tds").textContent).toBe("false");
  });

  it("activates 3-D Secure on ChallengeShopper", async () => {
    createPayment.mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: "ChallengeShopper", action: { type: "threeDS2" } }),
    } as any);
    const { onSubmit } = await setup();

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
});

describe("CardForm payment result callbacks", () => {
  it("fires onPaymentCompleted and shows success on Authorised", async () => {
    const onPaymentCompleted = vi.fn();
    const { checkout } = await setup(baseConfig({ onPaymentCompleted }));

    await act(async () => {
      checkout.onPaymentCompleted({ resultCode: "Authorised" });
    });

    expect(onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
    await waitFor(() => expect(screen.getByTestId("success").textContent).toBe("success.paymentAuthorized"));
  });

  it("fires onPaymentFailed and shows error on a refused result (Adyen 6 routing)", async () => {
    const onPaymentCompleted = vi.fn();
    const onPaymentFailed = vi.fn();
    const { checkout } = await setup(baseConfig({ onPaymentCompleted, onPaymentFailed }));

    await act(async () => {
      checkout.onPaymentCompleted({ resultCode: "Refused" });
    });

    expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Refused" });
    expect(onPaymentCompleted).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.paymentUnsuccessful"));
  });

  it("fires onPaymentFailed with a synthesized Error resultCode when called without data", async () => {
    const onPaymentFailed = vi.fn();
    const { checkout } = await setup(baseConfig({ onPaymentFailed }));

    await act(async () => {
      checkout.onPaymentFailed(undefined);
    });

    expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Error" });
  });
});

describe("CardForm CustomCard callbacks", () => {
  it("maps validation errors onto the corresponding field message", async () => {
    const { card } = await setup();

    await act(async () => {
      card.onValidationError([{ error: true, fieldType: "encryptedCardNumber", errorI18n: "Enter a valid number" }]);
    });

    expect(screen.getByText("Enter a valid number")).toBeTruthy();
  });

  it("hides the security-code field when the CVC policy is hidden", async () => {
    const { card } = await setup();
    // Initially the required security code field is visible.
    expect(screen.getByText("Security code")).toBeTruthy();

    await act(async () => {
      card.onBrand({ cvcPolicy: "hidden", brand: "visa" });
    });

    await waitFor(() => expect(screen.queryByText("Security code")).toBeNull());
  });
});

describe("CardForm submit button visibility", () => {
  it("renders the internal submit button by default", async () => {
    await setup();
    expect(screen.getByText(paymentMethods.formattedAmount)).toBeTruthy();
  });

  it("hides the internal submit button when hideSubmitButton is true", async () => {
    await setup(baseConfig({ hideSubmitButton: true }));
    expect(screen.queryByText(paymentMethods.formattedAmount)).toBeNull();
  });
});

describe("CardForm accessibility", () => {
  it("labels each secure card field as a named group for screen readers", async () => {
    await setup();
    // The visible <label> can't associate with a secure iframe via htmlFor, so each field
    // mount span carries role="group" + a localized aria-label instead.
    expect(screen.getByRole("group", { name: "Card number" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Expiry date" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Security code" })).toBeTruthy();
  });
});

describe("CardForm theme", () => {
  it("passes light field styles to the Adyen card by default", async () => {
    const { card } = await setup();
    expect(card.styles.base.color).toBe("#00112c");
  });

  it("passes dark field styles to the Adyen card when the theme is dark", async () => {
    const { card } = await setup(baseConfig({ theme: "dark" }));
    expect(card.styles.base.color).toBe("#e8edf2");
    expect(card.styles.placeholder.color).toBe("#aab4bf");
  });
});

describe("CardForm onCardValidityChanged", () => {
  it("reports (false, false) while the card method isn't the active/initialized one", async () => {
    const onCardValidityChanged = vi.fn();
    render(
      <I18nProvider i18nService={new I18nService("en-US")}>
        <PaymentMethodGroupContext
          initialValue={null}
          isSolePaymentMethod={false}
          hasCard={true}
          hasGooglePay={false}
          hasApplePay={false}
          hasStoredPaymentMethods={false}
        >
          <CardForm
            configuration={baseConfig({ onCardValidityChanged })}
            paymentMethods={paymentMethods}
            onBrandHidden={() => {}}
          />
        </PaymentMethodGroupContext>
      </I18nProvider>
    );

    await waitFor(() => expect(onCardValidityChanged).toHaveBeenCalledWith(false, false));
  });

  it("reports (isValid, true) once the card form is active and Adyen reports validity", async () => {
    const onCardValidityChanged = vi.fn();
    const { card } = await setup(baseConfig({ onCardValidityChanged }));
    onCardValidityChanged.mockClear();

    await act(async () => {
      card.onAllValid({ allValid: true });
    });
    expect(onCardValidityChanged).toHaveBeenCalledWith(true, true);

    await act(async () => {
      card.onAllValid({ allValid: false });
    });
    expect(onCardValidityChanged).toHaveBeenCalledWith(false, true);
  });

  it("reports (false, true) as soon as the card becomes active, so a custom submit button can appear disabled", async () => {
    const onCardValidityChanged = vi.fn();
    await setup(baseConfig({ onCardValidityChanged }));

    // Fires on activation (before any onAllValid), so a host's hidden-internal-button setup can
    // reveal its external button immediately rather than waiting for the first validity event.
    await waitFor(() => expect(onCardValidityChanged).toHaveBeenCalledWith(false, true));
  });

  it("reports (false, false) when a 3DS challenge starts, so the custom submit button hides", async () => {
    createPayment.mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: "ChallengeShopper", action: { type: "threeDS2" } }),
    } as any);
    const onCardValidityChanged = vi.fn();
    const { onSubmit } = await setup(baseConfig({ onCardValidityChanged }));
    onCardValidityChanged.mockClear();

    await act(async () => {
      await onSubmit(submitState, {}, actions());
    });

    // The card is no longer "active" while the challenge takes over the container.
    await waitFor(() => expect(onCardValidityChanged).toHaveBeenCalledWith(false, false));
  });
});

describe("CardForm additional details (3-D Secure continuation)", () => {
  const detailsState = { data: { details: { threeDSResult: "tds-result" } } };

  it("posts the details with sessionId and resolves on a valid result", async () => {
    createDetails.mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: "Authorised", action: null }),
    } as any);
    const { checkout } = await setup();
    const act1 = actions();

    await act(async () => {
      await checkout.onAdditionalDetails(detailsState, {}, act1);
    });

    expect(createDetails).toHaveBeenCalledWith("test", expect.objectContaining({ sessionId: "s1" }));
    expect(act1.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: null });
  });

  it("rejects and surfaces an error when the details request is not ok", async () => {
    createDetails.mockResolvedValue({ ok: false, json: async () => ({}) } as any);
    const { checkout } = await setup();
    const act1 = actions();

    await act(async () => {
      await checkout.onAdditionalDetails(detailsState, {}, act1);
    });

    expect(act1.reject).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.failedToSubmitPaymentDetails"));
  });

  it("rejects with paymentDetailsFailed when the response has no resultCode", async () => {
    createDetails.mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    const { checkout } = await setup();
    const act1 = actions();

    await act(async () => {
      await checkout.onAdditionalDetails(detailsState, {}, act1);
    });

    expect(act1.reject).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.paymentDetailsFailed"));
  });
});
