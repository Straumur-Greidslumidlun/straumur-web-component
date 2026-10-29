import "./google-pay-button.css";
import { h } from "preact";
import WalletButton, { WalletButtonProps } from "../shared/wallet-button";

type GooglePayButtonProps = Omit<WalletButtonProps, "method">;

function GooglePayButton(props: GooglePayButtonProps): h.JSX.Element | null {
  return <WalletButton method="googlepay" {...props} />;
}

export default GooglePayButton;
