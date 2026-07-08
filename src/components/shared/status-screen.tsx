import { h } from "preact";
import SuccessIcon from "../../assets/icons/success";
import FailureIcon from "../../assets/icons/failure";
import LoaderIcon from "../../assets/icons/loader";
import { ResultMessage } from "../../models/models";
import { I18nService } from "../../localizations/i18n-service";

export function RootComponent({ children }: { children: h.JSX.Element }) {
  return <div className="straumur__root-component">{children}</div>;
}

/** Full-widget loader shown while session mode fetches its payment methods. */
export function LoaderScreen() {
  return (
    <RootComponent>
      <div className="straumur__component">
        <LoaderIcon />
      </div>
    </RootComponent>
  );
}

/** Full-widget success/failure screen rendered imperatively by the StraumurCheckout class. */
export function StatusScreen({
  variant,
  message,
  i18n,
}: {
  variant: "success" | "failure";
  message: ResultMessage;
  i18n: I18nService;
}) {
  return (
    <RootComponent>
      <div className="straumur__component">
        {variant === "success" ? <SuccessIcon /> : <FailureIcon />}
        <p>{"key" in message ? i18n.t(message.key) : message.text}</p>
      </div>
    </RootComponent>
  );
}
