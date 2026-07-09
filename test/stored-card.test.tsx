import { h, Fragment } from "preact";
import { ResultMessage } from "../src/models/models";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/preact";

const A = vi.hoisted(() => {
  const cap: any = { checkout: [], card: [] };
  class FakeCustomCard {
    mount = vi.fn();
    unmount = vi.fn();
    submit = vi.fn();
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

import StoredCardContainerComponent from "../src/features/stored-card/stored-card-container-component";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { createPaymentRequest, postDisableTokenRequest } from "../src/adapter/straumur-adapter";
import { baseConfig, makePaymentMethods, storedCard } from "./helpers/fixtures";

const createPayment = vi.mocked(createPaymentRequest);
const disableToken = vi.mocked(postDisableTokenRequest);

const paymentMethods = makePaymentMethods({
  paymentMethods: { paymentMethods: [], storedPaymentMethods: [storedCard()] },
});

const messageText = (message: ResultMessage | null) =>
  message === null ? String(message) : "key" in message ? message.key : message.text;

function Probe() {
  const { error } = usePaymentMethodGroup();
  return <span data-testid="error">{messageText(error)}</span>;
}

async function setup(config = baseConfig()) {
  render(
    <I18nProvider i18nService={new I18nService("en-US")}>
      <PaymentMethodGroupContext
        initialValue="storedcard"
        isSolePaymentMethod={true}
        hasCard={false}
        hasGooglePay={false}
        hasApplePay={false}
        hasStoredPaymentMethods={true}
      >
        <Probe />
        <StoredCardContainerComponent configuration={config} paymentMethods={paymentMethods} />
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
  await waitFor(() => expect(A.cap.card.length).toBeGreaterThan(0));
}

beforeEach(() => {
  A.cap.checkout.length = 0;
  A.cap.card.length = 0;
  createPayment.mockReset();
  disableToken.mockReset();
});

describe("Stored card submit", () => {
  it("includes the storedPaymentMethodId in the payment request", async () => {
    createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "Authorised" }) } as any);
    await setup();
    const onSubmit = A.cap.card[0].onSubmit;

    await act(async () => {
      await onSubmit({ data: { paymentMethod: { type: "scheme" } } }, {}, { resolve: vi.fn(), reject: vi.fn() });
    });

    expect(createPayment).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({
        sessionId: "s1",
        paymentMethod: expect.objectContaining({ storedPaymentMethodId: "stored-1" }),
      })
    );
  });
});

describe("Stored card submit button visibility", () => {
  it("renders the internal submit button by default", async () => {
    await setup();
    expect(screen.getByText(paymentMethods.formattedAmount)).toBeTruthy();
  });

  it("hides the internal submit button when hideSubmitButton is true", async () => {
    await setup(baseConfig({ hideSubmitButton: true }));
    expect(screen.queryByText(paymentMethods.formattedAmount)).toBeNull();
  });
});

describe("Stored card removal", () => {
  it("removes the card from the list on a successful disable-token response", async () => {
    disableToken.mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as any);
    await setup();

    expect(screen.getByText("•••• 1234")).toBeTruthy();

    fireEvent.click(screen.getByText("Remove"));
    await act(async () => {
      fireEvent.click(screen.getByText("Yes, remove"));
    });

    await waitFor(() => expect(screen.queryByText("•••• 1234")).toBeNull());
    expect(disableToken).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ storedPaymentMethodId: "stored-1", sessionId: "s1" })
    );
  });

  it("surfaces an error and keeps the card when the disable request is not ok", async () => {
    disableToken.mockResolvedValue({ ok: false, json: async () => ({}) } as any);
    await setup();

    fireEvent.click(screen.getByText("Remove"));
    await act(async () => {
      fireEvent.click(screen.getByText("Yes, remove"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("error").textContent).toBe("error.failedToSubmitRemoveStoredPaymentCard")
    );
    expect(screen.getByText("•••• 1234")).toBeTruthy();
  });

  it("surfaces an error when the server reports success: false", async () => {
    disableToken.mockResolvedValue({ ok: true, json: async () => ({ success: false }) } as any);
    await setup();

    fireEvent.click(screen.getByText("Remove"));
    await act(async () => {
      fireEvent.click(screen.getByText("Yes, remove"));
    });

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("error.failedToRemoveStoredPaymentCard"));
  });
});

describe("Stored card theme", () => {
  it("passes light field styles to the Adyen card by default", async () => {
    await setup();
    expect(A.cap.card[0].styles.base.color).toBe("#00112c");
  });

  it("passes dark field styles to the Adyen card when the theme is dark", async () => {
    await setup(baseConfig({ theme: "dark" }));
    expect(A.cap.card[0].styles.base.color).toBe("#e8edf2");
    expect(A.cap.card[0].styles.placeholder.color).toBe("#9aa7b5");
  });
});
