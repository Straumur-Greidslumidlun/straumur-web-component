import { h, Fragment } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import ResultComponent from "../src/features/result-component/result-component";
import PaymentMethodsWrapper from "../src/features/payment-methods-wrapper/payment-methods-wrapper";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { translations } from "../src/localizations/translations";
import { makeGroupProps } from "./helpers/fixtures";

function ErrorTrigger() {
  const { handleError } = usePaymentMethodGroup();
  return <button data-testid="err" onClick={() => handleError({ key: "error.unknownError" })} />;
}
function SuccessTrigger() {
  const { handleSuccess } = usePaymentMethodGroup();
  return <button data-testid="ok" onClick={() => handleSuccess({ key: "success.paymentAuthorized" })} />;
}

function wrap(ui: h.JSX.Element) {
  return render(
    <I18nProvider i18nService={new I18nService("en-US")}>
      <PaymentMethodGroupContext {...(makeGroupProps() as any)}>{ui}</PaymentMethodGroupContext>
    </I18nProvider>
  );
}

describe("ResultComponent", () => {
  it("renders nothing when there is no error or success", () => {
    const { container } = wrap(<ResultComponent />);
    expect(container.querySelector(".straumur__result-component")).toBeNull();
  });

  it("renders the localized error message when an error is set", () => {
    wrap(
      <Fragment>
        <ErrorTrigger />
        <ResultComponent />
      </Fragment>
    );
    fireEvent.click(screen.getByTestId("err"));
    expect(screen.getByText(translations["en-US"]["error.unknownError"])).toBeTruthy();
  });

  it("renders the localized success message when success is set", () => {
    wrap(
      <Fragment>
        <SuccessTrigger />
        <ResultComponent />
      </Fragment>
    );
    fireEvent.click(screen.getByTestId("ok"));
    expect(screen.getByText(translations["en-US"]["success.paymentAuthorized"])).toBeTruthy();
  });
});

describe("PaymentMethodsWrapper", () => {
  it("shows children while there is no result", () => {
    wrap(
      <PaymentMethodsWrapper>
        <div data-testid="method">card</div>
      </PaymentMethodsWrapper>
    );
    expect(screen.getByTestId("method")).toBeTruthy();
  });

  it("hides children once an error is present", () => {
    wrap(
      <Fragment>
        <ErrorTrigger />
        <PaymentMethodsWrapper>
          <div data-testid="method">card</div>
        </PaymentMethodsWrapper>
      </Fragment>
    );
    fireEvent.click(screen.getByTestId("err"));
    expect(screen.queryByTestId("method")).toBeNull();
  });
});
