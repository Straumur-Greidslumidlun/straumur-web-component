import { h } from "preact";
import { createContext, ComponentChildren } from "preact";
import {
  useState,
  useContext,
  useCallback,
  useRef,
  useLayoutEffect,
} from "preact/hooks";
import { PaymentMethod } from "../../models/constants";
import { ResultMessage } from "../../models/models";

export type SubmitApi = {
  triggerSubmit: () => boolean;
};

type PaymentMethodContextType = {
  activePaymentMethod: PaymentMethod | null;
  setActivePaymentMethod: (value: PaymentMethod | null) => void;
  activeStoredPaymentMethodId: string | null;
  setActiveStoredPaymentMethodId: (value: string) => void;
  isPaymentMethodInitialized: Record<PaymentMethod, boolean>;
  updatePaymentMethodInitialization: (
    paymentMethod: PaymentMethod,
    isInitialized: boolean,
  ) => void;
  isStoredCardInitialized: Record<string, boolean>;
  updateStoredCardInitialization: (
    storedPaymentMethod: string,
    isInitialized: boolean,
  ) => void;
  handleSuccess: (success: ResultMessage) => void;
  success: ResultMessage | null;
  handleError: (error: ResultMessage) => void;
  error: ResultMessage | null;
  threeDSecureActive: boolean;
  setThreeDSecureActive: (value: boolean) => void;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
  registerSubmitHandler: (handler: () => void) => void;
  unregisterSubmitHandler: (handler: () => void) => void;
};

const PaymentMethodContext = createContext<
  PaymentMethodContextType | undefined
>(undefined);

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
  onSubmitApiReady,
}: {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasStoredPaymentMethods: boolean;
  onSubmitApiReady?: (api: SubmitApi) => void;
}): h.JSX.Element => {
  const [activePaymentMethod, setActivePaymentMethod] = useState(initialValue);
  const activeSubmitHandlerRef = useRef<(() => void) | null>(null);

  const registerSubmitHandler = useCallback((handler: () => void): void => {
    activeSubmitHandlerRef.current = handler;
  }, []);

  const unregisterSubmitHandler = useCallback((handler: () => void): void => {
    // Identity check guards against effect-cleanup ordering races when switching
    // between card-type payment methods: an outgoing form's cleanup must not
    // clobber a handler an incoming form already registered.
    if (activeSubmitHandlerRef.current === handler) {
      activeSubmitHandlerRef.current = null;
    }
  }, []);

  const triggerSubmit = useCallback((): boolean => {
    const handler = activeSubmitHandlerRef.current;

    if (!handler) {
      return false;
    }

    handler();
    return true;
  }, []);

  useLayoutEffect(() => {
    onSubmitApiReady?.({ triggerSubmit });
  }, []);
  const [activeStoredPaymentMethodId, setActiveStoredPaymentMethodId] =
    useState<string | null>(null);
  const [threeDSecureActive, setThreeDSecureActive] = useState<boolean>(false);
  const [isPaymentMethodInitialized, setIsPaymentMethodInitialized] =
    useState(defaultIsInitialized);
  const [isStoredCardInitialized, setIsStoredCardInitialized] = useState<
    Record<string, boolean>
  >({});

  const [success, setSuccess] = useState<ResultMessage | null>(null);
  const [error, setError] = useState<ResultMessage | null>(null);

  const updatePaymentMethodInitialization = (
    paymentMethod: PaymentMethod,
    isInitialized: boolean,
  ) => {
    setIsPaymentMethodInitialized((prevState) => ({
      ...prevState,
      [paymentMethod]: isInitialized,
    }));
  };

  const updateStoredCardInitialization = (
    storedPaymentMethod: string,
    isInitialized: boolean,
  ) => {
    setIsStoredCardInitialized((prevState) => ({
      ...prevState,
      [storedPaymentMethod]: isInitialized,
    }));
  };

  const handleError = (error: ResultMessage) => {
    setError(error);
  };

  const handleSuccess = (success: ResultMessage) => {
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
        registerSubmitHandler,
        unregisterSubmitHandler,
      }}
    >
      {children}
    </PaymentMethodContext.Provider>
  );
};

export const usePaymentMethodGroup = (): PaymentMethodContextType => {
  const context = useContext(PaymentMethodContext);
  if (context === undefined) {
    throw new Error(
      "usePaymentMethodGroup must be used within a PaymentMethodGroup",
    );
  }
  return context as PaymentMethodContextType;
};
