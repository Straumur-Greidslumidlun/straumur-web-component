import { Fragment, h } from "preact";
import "./result-component.css";
import SuccessIcon from "../../assets/icons/success";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import FailureIcon from "../../assets/icons/failure";
import { useI18n } from "../../localizations/i18n-context";
import { ResultMessage } from "../../models/models";

function ResultComponent(): h.JSX.Element | null {
  const { error, success } = usePaymentMethodGroup();
  const { i18n } = useI18n();

  if (!error && !success) {
    return null;
  }

  const renderMessage = (message: ResultMessage) => ("key" in message ? i18n.t(message.key) : message.text);

  return (
    <div className="straumur__result-component">
      {error && (
        <Fragment>
          <span aria-hidden="true">
            <FailureIcon />
          </span>
          {/* role="alert" announces the failure to screen readers assertively (a declined payment
              was previously silent). */}
          <p className="straumur__result-component__error--message" role="alert">
            {renderMessage(error)}
          </p>
        </Fragment>
      )}

      {success && (
        <Fragment>
          <span aria-hidden="true">
            <SuccessIcon />
          </span>
          <p className="straumur__result-component__success--message" role="status">
            {renderMessage(success)}
          </p>
        </Fragment>
      )}
    </div>
  );
}

export default ResultComponent;
