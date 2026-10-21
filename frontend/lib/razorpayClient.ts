/**
 * KnowledgePaat — Client-Side Razorpay Standard Checkout Loader
 *
 * Configures official Razorpay Standard Checkout for UPI Intent (mobile)
 * and checkout-hosted UPI QR (desktop), with Cards, Netbanking, and Wallets
 * preserved as fallback options.
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
    backdrop_color?: string;
  };
  config?: any;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    escape?: boolean;
    animation?: boolean;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically load Razorpay checkout script with deduplication and retry support.
 */
export function loadRazorpayCheckoutScript(forceReload = false): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if ((window as any).Razorpay && !forceReload) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise && !forceReload) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      if (forceReload) {
        existing.remove();
      }
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Could not load remote Razorpay script. Check network or ad-blockers.');
      scriptLoadingPromise = null; // Reset to allow retry
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Official Razorpay Standard Checkout configuration:
 * Prioritizes UPI Intent (mobile) and Dynamic UPI QR (desktop),
 * while keeping Cards, Netbanking, and Wallets visible as fallbacks.
 *
 * NOTE: Setting show_default_blocks to true ensures that if UPI is not yet
 * enabled on the merchant account or unavailable on the user's platform,
 * checkout does NOT fail with "No appropriate payment method found", but instead
 * displays active card/netbanking methods seamlessly.
 */
export const RAZORPAY_UPI_CHECKOUT_CONFIG = {
  display: {
    blocks: {
      upi: {
        name: 'Pay via UPI / QR Code',
        instruments: [
          {
            method: 'upi',
            flows: ['intent', 'qr'],
            apps: ['google_pay', 'phonepe', 'paytm', 'bhim']
          }
        ]
      },
      fallback: {
        name: 'Cards, Netbanking & Wallets',
        instruments: [
          { method: 'card' },
          { method: 'netbanking' },
          { method: 'wallet' }
        ]
      }
    },
    sequence: ['block.upi', 'block.fallback'],
    preferences: {
      show_default_blocks: true
    }
  }
};

/**
 * Backward compatibility alias
 */
export const RAZORPAY_UPI_ONLY_CONFIG = RAZORPAY_UPI_CHECKOUT_CONFIG;

export interface KnowledgePaatCheckoutArgs {
  keyId: string;
  amountPaise: number;
  currency?: string;
  internalOrderId: string;
  razorpayOrderId: string;
  orderNumber?: string;
  description: string;
  customer?: {
    fullName?: string;
    email?: string;
    contact?: string;
  };
  prefillMethod?: string;
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => Promise<void> | void;
  onDismiss?: () => void;
  onPaymentFailed?: (error: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  }) => void;
}

/**
 * Shared KnowledgePaat Razorpay Standard Checkout Launcher
 * Used across Cart Checkout and My Books PDF Upgrades.
 */
export async function openKnowledgePaatRazorpayCheckout(
  args: KnowledgePaatCheckoutArgs
): Promise<void> {
  const isLoaded = await loadRazorpayCheckoutScript();

  if (isLoaded && typeof (window as any).Razorpay !== 'undefined') {
    const options: RazorpayCheckoutOptions = {
      key: args.keyId,
      amount: args.amountPaise,
      currency: args.currency || 'INR',
      name: 'KnowledgePaat',
      description: args.description,
      order_id: args.razorpayOrderId,
      prefill: {
        name: args.customer?.fullName || 'Valued Customer',
        email: args.customer?.email || 'customer@knowledgepaat.test',
        contact: args.customer?.contact || '',
        ...(args.prefillMethod ? { method: args.prefillMethod } : {}),
      },
      notes: {
        internalOrderId: args.internalOrderId,
        orderNumber: args.orderNumber || '',
        platform: 'KnowledgePaat',
        ...args.notes
      },
      theme: {
        color: args.themeColor || '#0B1D3A' // KnowledgePaat Brand Navy
      },
      config: RAZORPAY_UPI_CHECKOUT_CONFIG,
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (args.onDismiss) {
            args.onDismiss();
          }
        }
      },
      handler: async (response) => {
        await args.onSuccess(response);
      }
    };

    const rzp = new (window as any).Razorpay(options);

    rzp.on('payment.failed', function (response: any) {
      console.warn('Razorpay Payment Failed / Declined:', response?.error);
      if (args.onPaymentFailed) {
        args.onPaymentFailed(response?.error || { description: 'Payment declined or cancelled.' });
      }
    });

    rzp.open();
    return;
  }

  // Fallback for development/testing if checkout.js is blocked by offline/ad-blocker
  if (process.env.NODE_ENV === 'development') {
    const confirmed = window.confirm(
      `[RAZORPAY TEST MODE CHECKOUT — UPI & QR SIMULATION]\n\nProduct: ${args.description}\nAmount: ₹${(args.amountPaise / 100).toFixed(2)}\nOrder ID: ${args.razorpayOrderId}\n\nClick OK to simulate successful UPI payment, or Cancel to dismiss.`
    );

    if (confirmed) {
      const testPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
      await args.onSuccess({
        razorpay_payment_id: testPaymentId,
        razorpay_order_id: args.razorpayOrderId,
        razorpay_signature: `test_sig_${testPaymentId}`
      });
      return;
    }

    if (args.onDismiss) {
      args.onDismiss();
    }
    return;
  }

  throw new Error(
    'Payment gateway script could not be loaded. Please check your internet connection or disable ad-blockers and try again.'
  );
}

/**
 * Launch Razorpay popup (compatibility wrapper)
 */
export async function launchRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayCheckoutScript();

  if (isLoaded && (window as any).Razorpay) {
    const checkoutConfig = options.config || RAZORPAY_UPI_CHECKOUT_CONFIG;

    const rzp = new (window as any).Razorpay({
      ...options,
      prefill: {
        ...options.prefill,
        method: 'upi'
      },
      config: checkoutConfig,
      theme: {
        color: options.theme?.color || '#0B1D3A',
        ...options.theme
      }
    });

    rzp.on('payment.failed', function (response: any) {
      console.error('Razorpay Payment Failed:', response.error);
    });

    rzp.open();
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    const confirmed = window.confirm(
      `[RAZORPAY TEST MODE CHECKOUT]\n\nProduct: ${options.description}\nAmount: ₹${options.amount / 100}\nOrder ID: ${options.order_id}\n\nClick OK to simulate successful test payment, or Cancel to dismiss.`
    );

    if (confirmed) {
      const testPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
      options.handler({
        razorpay_payment_id: testPaymentId,
        razorpay_order_id: options.order_id,
        razorpay_signature: `test_sig_${testPaymentId}`
      });
      return;
    }
  } else {
    alert('Unable to securely load Razorpay Checkout gateway. Please check your internet connection and try again.');
  }

  if (options.modal?.ondismiss) {
    options.modal.ondismiss();
  }
}
