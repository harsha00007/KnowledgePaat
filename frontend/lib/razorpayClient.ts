/**
 * KnowledgePaat — Client-Side Razorpay Test Mode Checkout Loader
 * Dynamically loads and initialises the Razorpay Checkout Popup.
 * Configured exclusively for UPI and QR Code payments (Cards, Netbanking, Wallets, EMI, PayLater hidden).
 */

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  config?: any;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically load Razorpay checkout script with deduplication
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Could not load remote Razorpay script. Simulated test mode flow will be available.');
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Official Razorpay Standard Checkout configuration to restrict payment methods
 * EXCLUSIVELY to UPI and QR Code.
 * Explicitly hides: Cards, Netbanking, Wallets, EMI, Cardless EMI, and Pay Later.
 */
export const RAZORPAY_UPI_ONLY_CONFIG = {
  display: {
    hide: [
      { method: 'card' },
      { method: 'netbanking' },
      { method: 'wallet' },
      { method: 'emi' },
      { method: 'paylater' },
      { method: 'cardless_emi' },
      { method: 'bank_transfer' }
    ],
    preferences: {
      show_default_blocks: true
    }
  }
};

/**
 * Launch Razorpay popup or fallback to test mode simulator if checkout.js is blocked
 */
export async function launchRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayCheckoutScript();

  if (isLoaded && (window as any).Razorpay) {
    const checkoutConfig = options.config || RAZORPAY_UPI_ONLY_CONFIG;

    const rzp = new (window as any).Razorpay({
      ...options,
      prefill: {
        ...options.prefill,
        method: 'upi' // Directs checkout to open UPI / QR code payment flow
      },
      config: checkoutConfig,
      theme: {
        color: options.theme?.color || '#3b82f6',
        ...options.theme
      }
    });

    rzp.on('payment.failed', function (response: any) {
      console.error('Razorpay Payment Failed:', response.error);
    });

    rzp.open();
    return;
  }

  // Fallback for development environments where third-party scripts are blocked or during offline testing:
  if (process.env.NODE_ENV === 'development') {
    const confirmed = window.confirm(
      `[RAZORPAY TEST MODE CHECKOUT — UPI & QR ONLY]\n\nProduct/Plan: ${options.description}\nAmount: ₹${options.amount / 100}\nPayment Method: UPI / QR Code\nOrder ID: ${options.order_id}\n\nClick OK to simulate successful UPI test payment, or Cancel to dismiss.`
    );

    if (confirmed) {
      const testPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
      // The signature will be verified cryptographically on the server
      options.handler({
        razorpay_payment_id: testPaymentId,
        razorpay_order_id: options.order_id,
        razorpay_signature: `test_sig_${testPaymentId}`
      });
      return;
    }
  } else {
    alert("Unable to securely load Razorpay Checkout gateway. Please check your internet connection or disable ad-blockers and try again.");
  }

  if (options.modal?.ondismiss) {
    options.modal.ondismiss();
  }
}
