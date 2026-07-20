import { h, ComponentChildren } from "preact";
import SuccessIcon from "../../assets/icons/success";
import FailureIcon from "../../assets/icons/failure";
import LoaderIcon from "../../assets/icons/loader";
import { ResultMessage, Theme } from "../../models/models";
import { I18nService } from "../../localizations/i18n-service";
import { useResolvedTheme } from "../../utils/custom-hooks/use-resolved-theme";

// The widget's outer wrapper. Carries data-theme so the dark palette is scoped to the
// widget (never leaks to the host page); "system" resolves live via prefers-color-scheme.
export function RootComponent({ children, theme = "light" }: { children: ComponentChildren; theme?: Theme }) {
  const resolvedTheme = useResolvedTheme(theme);
  return (
    <div className="straumur__root-component" data-theme={resolvedTheme}>
      {children}
    </div>
  );
}

/** Full-widget loader shown while session mode fetches its payment methods. */
export function LoaderScreen({ theme }: { theme?: Theme }) {
  return (
    <RootComponent theme={theme}>
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
  theme,
}: {
  variant: "success" | "failure";
  message: ResultMessage;
  i18n: I18nService;
  theme?: Theme;
}) {
  return (
    <RootComponent theme={theme}>
      <div className="straumur__component">
        <span aria-hidden="true">{variant === "success" ? <SuccessIcon /> : <FailureIcon />}</span>
        {/* Failure is announced assertively (role="alert"); success politely (role="status"). */}
        <p className="straumur__result-message" role={variant === "success" ? "status" : "alert"}>
          {"key" in message ? i18n.t(message.key) : message.text}
        </p>
      </div>
    </RootComponent>
  );
}
