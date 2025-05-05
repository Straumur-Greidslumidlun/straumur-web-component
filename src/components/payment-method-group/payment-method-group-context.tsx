import { h, RefObject } from "preact";
import { createContext } from "preact";
import { useState, useContext, useRef } from "preact/hooks";
import { ComponentChildren } from "preact";
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
  threeDSecureRef: RefObject<HTMLDivElement> | null;
  setThreeDSecureRef: (ref: HTMLDivElement) => void;
  threeDSecureActive: boolean;
  setThreeDSecureActive: (value: boolean) => void;
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
}: {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
}): h.JSX.Element => {
  const [activePaymentMethod, setActivePaymentMethod] = useState(initialValue);
  const [activeStoredPaymentMethodId, setActiveStoredPaymentMethodId] = useState<string | null>(null);
  const [threeDSecureActive, setThreeDSecureActive] = useState<boolean>(false);
  const [isPaymentMethodInitialized, setIsPaymentMethodInitialized] = useState(defaultIsInitialized);
  const [isStoredCardInitialized, setIsStoredCardInitialized] = useState<Record<string, boolean>>({});
  const threeDSecureRef = useRef<HTMLDivElement>(null);

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

  const setThreeDSecureRef = (ref: HTMLDivElement) => {
    threeDSecureRef.current = ref;
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
        threeDSecureRef,
        setThreeDSecureRef,
        threeDSecureActive,
        setThreeDSecureActive,
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
