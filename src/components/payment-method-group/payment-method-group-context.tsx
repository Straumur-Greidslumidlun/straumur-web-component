import { h } from "preact";
import { createContext, ComponentChildren } from "preact";
import { useState, useContext } from "preact/hooks";
import { PaymentMethod } from "../../models/constants";
import { TranslationKey } from "../../localizations/translations";

type PaymentMethodContextType = {
  activePaymentMethod: PaymentMethod | null;
  setActivePaymentMethod: (value: PaymentMethod) => void;
  activeStoredPaymentMethodId: string | null;
  setActiveStoredPaymentMethodId: (value: string) => void;
  isPaymentMethodInitialized: Record<PaymentMethod, boolean>;
  updatePaymentMethodInitialization: (paymentMethod: PaymentMethod, isInitialized: boolean) => void;
  isStoredCardInitialized: Record<string, boolean>;
  updateStoredCardInitialization: (storedPaymentMethod: string, isInitialized: boolean) => void;
  handleSuccess: (success: TranslationKey) => void;
  success: TranslationKey | null;
  handleError: (error: TranslationKey) => void;
  error: TranslationKey | null;
  threeDSecureActive: boolean;
  setThreeDSecureActive: (value: boolean) => void;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
};

const PaymentMethodContext = createContext<PaymentMethodContextType | undefined>(undefined);

const defaultIsInitialized: Record<PaymentMethod, boolean> = {
  card: false,
  storedcard: false,
  googlepay: false,
  applepay: false,
};

export const PaymentMethodGroupContext = ({
  children,
  initialValue,
  isSolePaymentMethod,
  hasCard,
  hasGooglePay,
  hasApplePay,
  hasStoredPaymentMethods,
}: {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
}): h.JSX.Element => {
  const [activePaymentMethod, setActivePaymentMethod] = useState(initialValue);
  const [activeStoredPaymentMethodId, setActiveStoredPaymentMethodId] = useState<string | null>(null);
  const [threeDSecureActive, setThreeDSecureActive] = useState<boolean>(false);
  const [isPaymentMethodInitialized, setIsPaymentMethodInitialized] = useState(defaultIsInitialized);
  const [isStoredCardInitialized, setIsStoredCardInitialized] = useState<Record<string, boolean>>({});

  const [success, setSuccess] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);

  const updatePaymentMethodInitialization = (paymentMethod: PaymentMethod, isInitialized: boolean) => {
    setIsPaymentMethodInitialized((prevState) => ({
      ...prevState,
      [paymentMethod]: isInitialized,
    }));
  };

  const updateStoredCardInitialization = (storedPaymentMethod: string, isInitialized: boolean) => {
    setIsStoredCardInitialized((prevState) => ({
      ...prevState,
      [storedPaymentMethod]: isInitialized,
    }));
  };

  const handleError = (error: TranslationKey) => {
    setError(error);
  };

  const handleSuccess = (success: TranslationKey) => {
    setSuccess(success);
  };

  return (
    <PaymentMethodContext.Provider
      value={{
        activePaymentMethod,
        setActivePaymentMethod,
        activeStoredPaymentMethodId,
        setActiveStoredPaymentMethodId,
        isPaymentMethodInitialized,
        updatePaymentMethodInitialization,
        isStoredCardInitialized,
        updateStoredCardInitialization,
        handleSuccess,
        success,
        handleError,
        error,
        threeDSecureActive,
        setThreeDSecureActive,
        isSolePaymentMethod,
        hasCard,
        hasGooglePay,
        hasApplePay,
        hasStoredPaymentMethods,
      }}
    >
      {children}
    </PaymentMethodContext.Provider>
  );
};

export const usePaymentMethodGroup = (): PaymentMethodContextType => {
  const context = useContext(PaymentMethodContext);
  if (context === undefined) {
    throw new Error("usePaymentMethodGroup must be used within a PaymentMethodGroup");
  }
  return context as PaymentMethodContextType;
};
