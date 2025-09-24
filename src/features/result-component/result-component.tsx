import { Fragment, h } from "preact";
import "./result-component.css";
import SuccessIcon from "../../assets/icons/success";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import FailureIcon from "../../assets/icons/failure";
import { useI18n } from "../../localizations/i18n-context";

function ResultComponent(): h.JSX.Element | null {
  const { error, success } = usePaymentMethodGroup();
  const { i18n } = useI18n();

  if (!error && !success) {
    return null;
  }

  return (
    <div className="straumur__result-component">
      {error && (
        <Fragment>
          <FailureIcon />
          <p className="straumur__result-component__error--message">{i18n.t(error)}</p>
        </Fragment>
      )}

      {success && (
        <Fragment>
          <SuccessIcon />
          <p className="straumur__result-component__success--message">{i18n.t(success)}</p>
        </Fragment>
      )}
    </div>
  );
}

export default ResultComponent;
