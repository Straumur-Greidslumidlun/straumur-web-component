import { h } from "preact";
import { createContext, ComponentChildren } from "preact";
import { useState, useContext, useCallback, useRef, useLayoutEffect } from "preact/hooks";
import { PaymentMethod } from "../../models/constants";
import { ResultMessage } from "../../models/models";

/** A submit trigger registered by the active card-type component. May be async — see SubmitApi. */
export type SubmitHandler = () => void | Promise<void>;

export type SubmitApi = {
  /**
   * Invokes the active card form's submit handler. The boolean only says a handler existed
   * and was invoked — the submission itself runs asynchronously and reports its outcome
   * through onPaymentCompleted/onPaymentFailed.
   */
  triggerSubmit: () => boolean;
};

type PaymentMethodContextType = {
  activePaymentMethod: PaymentMethod | null;
  setActivePaymentMethod: (value: PaymentMethod | null) => void;
  activeStoredPaymentMethodId: string | null;
  setActiveStoredPaymentMethodId: (value: string) => void;
  isPaymentMethodInitialized: Record<PaymentMethod, boolean>;
  updatePaymentMethodInitialization: (paymentMethod: PaymentMethod, isInitialized: boolean) => void;
  isStoredCardInitialized: Record<string, boolean>;
  updateStoredCardInitialization: (storedPaymentMethod: string, isInitialized: boolean) => void;
  handleSuccess: (success: ResultMessage) => void;
  success: ResultMessage | null;
  handleError: (error: ResultMessage) => void;
  error: ResultMessage | null;
  threeDSecureActive: boolean;
  setThreeDSecureActive: (value: boolean) => void;
  /**
   * True while any payment method's submission is in flight (from the moment its /payments call
   * starts until the outcome takes over the widget or the call fails). Used to lock the rest of the
   * UI — other method rows, wallet buttons, submit buttons — so the shopper can't start a second,
   * concurrent attempt. (The backend also serializes attempts, so this is UX, not the safety net.)
   */
  paymentInProgress: boolean;
  setPaymentInProgress: (value: boolean) => void;
  /**
   * True while a 3DS challenge run by ANOTHER payment method takes over the widget —
   * the asking component must render nothing. Components matching a specific stored card
   * additionally check their own card id (see stored-card-component).
   */
  isObscuredByThreeDS: (method: PaymentMethod) => boolean;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasKortalan: boolean;
  hasStoredPaymentMethods: boolean;
  registerSubmitHandler: (handler: SubmitHandler) => void;
  unregisterSubmitHandler: (handler: SubmitHandler) => void;
};

const PaymentMethodContext = createContext<PaymentMethodContextType | undefined>(undefined);

const defaultIsInitialized: Record<PaymentMethod, boolean> = {
  card: false,
  storedcard: false,
  googlepay: false,
  applepay: false,
  kortalan: false,
};

export const PaymentMethodGroupContext = ({
  children,
  initialValue,
  initialStoredPaymentMethodId = null,
  isSolePaymentMethod,
  hasCard,
  hasGooglePay,
  hasApplePay,
  hasKortalan,
  hasStoredPaymentMethods,
  onSubmitApiReady,
}: {
  children: ComponentChildren;
  initialValue: PaymentMethod | null;
  initialStoredPaymentMethodId?: string | null;
  isSolePaymentMethod: boolean;
  hasCard: boolean;
  hasGooglePay: boolean;
  hasApplePay: boolean;
  hasKortalan: boolean;
  hasStoredPaymentMethods: boolean;
  onSubmitApiReady?: (api: SubmitApi) => void;
}): h.JSX.Element => {
  const [activePaymentMethod, setActivePaymentMethod] = useState(initialValue);
  const activeSubmitHandlerRef = useRef<SubmitHandler | null>(null);

  const registerSubmitHandler = useCallback((handler: SubmitHandler): void => {
    activeSubmitHandlerRef.current = handler;
  }, []);

  const unregisterSubmitHandler = useCallback((handler: SubmitHandler): void => {
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
  const [activeStoredPaymentMethodId, setActiveStoredPaymentMethodId] = useState<string | null>(
    initialStoredPaymentMethodId
  );
  const [threeDSecureActive, setThreeDSecureActive] = useState<boolean>(false);
  const [paymentInProgress, setPaymentInProgress] = useState<boolean>(false);
  const [isPaymentMethodInitialized, setIsPaymentMethodInitialized] = useState(defaultIsInitialized);
  const [isStoredCardInitialized, setIsStoredCardInitialized] = useState<Record<string, boolean>>({});

  const [success, setSuccess] = useState<ResultMessage | null>(null);
  const [error, setError] = useState<ResultMessage | null>(null);

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

  const isObscuredByThreeDS = useCallback(
    (method: PaymentMethod): boolean => threeDSecureActive && activePaymentMethod !== method,
    [threeDSecureActive, activePaymentMethod]
  );

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
        paymentInProgress,
        setPaymentInProgress,
        isObscuredByThreeDS,
        isSolePaymentMethod,
        hasCard,
        hasGooglePay,
        hasApplePay,
        hasKortalan,
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
    throw new Error("usePaymentMethodGroup must be used within a PaymentMethodGroup");
  }
  return context as PaymentMethodContextType;
};
