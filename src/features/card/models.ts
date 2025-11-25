import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";

export interface CardComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}
