import "./apple-pay-button.css";
import { h } from "preact";
import WalletButton, { WalletButtonProps } from "../shared/wallet-button";

type ApplePayButtonProps = Omit<WalletButtonProps, "method">;

function ApplePayButton(props: ApplePayButtonProps): h.JSX.Element | null {
  return <WalletButton method="applepay" {...props} />;
}

export default ApplePayButton;
