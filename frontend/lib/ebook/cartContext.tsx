"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type EBookPlan = 'read_online' | 'read_download';

export interface StoredCartItem {
  bookId: string;
  plan: EBookPlan;
  addedAt: number;
  lastPricePaise?: number;
}

export interface StoredCartPayload {
  version: 1;
  items: StoredCartItem[];
}

export interface ValidatedCartItem {
  book_id: string;
  edition_id: string;
  slug: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  plan: EBookPlan;
  plan_label: string;
  price_paise: number;
  formatted_price: string;
  currency: string;
  edition_number: number;
  version_name: string;
}

export type ValidationStatus = 'idle' | 'validating' | 'validated' | 'error';

interface EBookCartContextType {
  isHydrated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  validationStatus: ValidationStatus;
  validationError: string | null;
  cartCount: number;
  storedItems: StoredCartItem[];
  validatedItems: ValidatedCartItem[];
  totalPaise: number;
  formattedTotal: string;
  warnings: string[];
  addToCart: (bookId: string, plan?: EBookPlan) => Promise<{ success: boolean; isUpdate: boolean; message: string }>;
  updatePlan: (bookId: string, plan: EBookPlan) => Promise<void>;
  removeFromCart: (bookId: string) => void;
  clearCart: () => void;
  revalidateCart: () => Promise<void>;
  hasBook: (bookId: string) => boolean;
  getBookPlan: (bookId: string) => EBookPlan | null;
}

const CART_STORAGE_KEY = 'knowledgepaat_ebook_cart_v1';

const EBookCartContext = createContext<EBookCartContextType | null>(null);

/**
 * Safely reads and validates cart from browser localStorage
 */
function safeReadStorage(): StoredCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];

    // Version check
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return [];
    }

    const validPlans = new Set<EBookPlan>(['read_online', 'read_download']);
    const cleanItems: StoredCartItem[] = [];
    const seenBooks = new Set<string>();

    for (const item of parsed.items) {
      if (!item || typeof item !== 'object') continue;
      const bookId = String(item.bookId || '').trim();
      let plan = item.plan as EBookPlan;

      if (!bookId) continue;
      if (!validPlans.has(plan)) {
        plan = 'read_online';
      }
      if (seenBooks.has(bookId)) continue; // 1 item per book constraint

      seenBooks.add(bookId);
      cleanItems.push({
        bookId,
        plan,
        addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
        lastPricePaise: typeof item.lastPricePaise === 'number' ? item.lastPricePaise : undefined,
      });
    }

    return cleanItems;
  } catch (err) {
    console.warn('Failed reading ebook cart from storage (corrupt or unavailable):', err);
    return [];
  }
}

/**
 * Safely writes cart to browser localStorage
 */
function safeWriteStorage(items: StoredCartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredCartPayload = {
      version: 1,
      items,
    };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed writing ebook cart to storage:', err);
  }
}

export function EBookCartProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>([]);
  const [validatedItems, setValidatedItems] = useState<ValidatedCartItem[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [formattedTotal, setFormattedTotal] = useState('₹0');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Ref to prevent race conditions during rapid state updates
  const itemsRef = useRef(storedItems);
  useEffect(() => {
    itemsRef.current = storedItems;
  }, [storedItems]);

  /**
   * Server Re-validation
   */
  const revalidateWithServer = useCallback(async (currentStoredItems: StoredCartItem[]) => {
    if (currentStoredItems.length === 0) {
      setValidatedItems([]);
      setTotalPaise(0);
      setFormattedTotal('₹0');
      setWarnings([]);
      setValidationStatus('idle');
      setValidationError(null);
      setIsLoading(false);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setValidationStatus('validating');
    setValidationError(null);

    try {
      const res = await fetch('/api/ebooks/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentStoredItems.map(i => ({
            bookId: i.bookId,
            plan: i.plan,
            clientPricePaise: i.lastPricePaise,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Server returned error during cart validation.');
      }

      const data = await res.json();
      if (data.success) {
        setValidatedItems(data.items || []);
        setTotalPaise(data.total_paise || 0);
        setFormattedTotal(data.formatted_total || `₹${Math.round((data.total_paise || 0) / 100)}`);
        setWarnings(data.warnings || []);
        setValidationStatus('validated');
        setValidationError(null);

        // Update stored items with authoritative prices from server
        const unavailableSet = new Set(data.unavailable_book_ids || []);
        const updatedStored = currentStoredItems
          .filter(i => !unavailableSet.has(i.bookId))
          .map(st => {
            const serverItem = (data.items || []).find((vi: { book_id: string; price_paise: number }) => vi.book_id === st.bookId);
            return {
              ...st,
              lastPricePaise: serverItem ? serverItem.price_paise : st.lastPricePaise,
            };
          });

        setStoredItems(updatedStored);
        safeWriteStorage(updatedStored);
      } else {
        throw new Error(data.error || 'Cart validation failed.');
      }
    } catch (err: unknown) {
      console.error('Error during cart server revalidation:', err);
      setValidationStatus('error');
      setValidationError('Live price verification could not be completed. Please check your connection and click Revalidate Prices.');
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, []);

  // Hydration & initial load
  useEffect(() => {
    const initialItems = safeReadStorage();
    queueMicrotask(() => {
      setStoredItems(initialItems);
      setIsHydrated(true);
      revalidateWithServer(initialItems);
    });
  }, [revalidateWithServer]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) {
        const synced = safeReadStorage();
        setStoredItems(synced);
        revalidateWithServer(synced);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [revalidateWithServer]);

  /**
   * Add book or update existing book plan
   */
  const addToCart = async (bookId: string, plan: EBookPlan = 'read_online') => {
    const cleanId = String(bookId || '').trim();
    if (!cleanId) return { success: false, isUpdate: false, message: 'Invalid book identifier.' };

    const current = itemsRef.current;
    const existingIndex = current.findIndex(i => i.bookId === cleanId);

    let updated: StoredCartItem[];
    let isUpdate = false;

    if (existingIndex >= 0) {
      isUpdate = true;
      updated = current.map((item, idx) => {
        if (idx === existingIndex) {
          return { ...item, plan };
        }
        return item;
      });
    } else {
      updated = [
        ...current,
        {
          bookId: cleanId,
          plan,
          addedAt: Date.now(),
        },
      ];
    }

    setStoredItems(updated);
    safeWriteStorage(updated);
    await revalidateWithServer(updated);

    return {
      success: true,
      isUpdate,
      message: isUpdate
        ? 'Book plan updated in your cart.'
        : 'Book successfully added to your cart.',
    };
  };

  /**
   * Change selected plan for an existing book
   */
  const updatePlan = async (bookId: string, plan: EBookPlan) => {
    const cleanId = String(bookId || '').trim();
    const current = itemsRef.current;
    const exists = current.some(i => i.bookId === cleanId);
    if (!exists) return;

    const updated = current.map(item => {
      if (item.bookId === cleanId) {
        return { ...item, plan };
      }
      return item;
    });

    setStoredItems(updated);
    safeWriteStorage(updated);
    await revalidateWithServer(updated);
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = (bookId: string) => {
    const cleanId = String(bookId || '').trim();
    const updated = itemsRef.current.filter(i => i.bookId !== cleanId);
    setStoredItems(updated);
    safeWriteStorage(updated);
    revalidateWithServer(updated);
  };

  /**
   * Clear all items
   */
  const clearCart = () => {
    setStoredItems([]);
    setValidatedItems([]);
    setTotalPaise(0);
    setFormattedTotal('₹0');
    setWarnings([]);
    setValidationStatus('idle');
    setValidationError(null);
    safeWriteStorage([]);
  };

  /**
   * Manual revalidate
   */
  const revalidateCart = async () => {
    await revalidateWithServer(itemsRef.current);
  };

  const hasBook = (bookId: string) => {
    return itemsRef.current.some(i => i.bookId === bookId);
  };

  const getBookPlan = (bookId: string) => {
    const item = itemsRef.current.find(i => i.bookId === bookId);
    return item ? item.plan : null;
  };

  const value: EBookCartContextType = {
    isHydrated,
    isLoading,
    isValidating,
    validationStatus,
    validationError,
    cartCount: storedItems.length,
    storedItems,
    validatedItems,
    totalPaise,
    formattedTotal,
    warnings,
    addToCart,
    updatePlan,
    removeFromCart,
    clearCart,
    revalidateCart,
    hasBook,
    getBookPlan,
  };

  return (
    <EBookCartContext.Provider value={value}>
      {children}
    </EBookCartContext.Provider>
  );
}

export function useEBookCart(): EBookCartContextType {
  const context = useContext(EBookCartContext);
  if (!context) {
    throw new Error('useEBookCart must be used within an EBookCartProvider');
  }
  return context;
}
