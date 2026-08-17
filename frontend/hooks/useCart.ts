"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CartItem, StoreProduct } from '@/lib/store';

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchCart = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartItems([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:product_id (*)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching cart items:", error);
      } else if (data) {
        setCartItems(data as CartItem[]);
      }
    } catch (err) {
      console.error("Failed to load cart items:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (product: StoreProduct): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'Please log in to add items to cart.' };

      // Check if already in cart
      const alreadyInCart = cartItems.some(item => item.product_id === product.id);
      if (alreadyInCart) {
        return { success: false, message: 'Item is already in your cart.' };
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          student_id: user.id,
          product_id: product.id
        })
        .select(`
          *,
          product:product_id (*)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, message: 'Item is already in your cart.' };
        }
        throw error;
      }

      if (data) {
        setCartItems(prev => [data as CartItem, ...prev]);
      }
      return { success: true };
    } catch (err: any) {
      console.error("Failed to add item to cart:", err);
      return { success: false, message: err.message || 'Could not add to cart.' };
    }
  };

  const removeFromCart = async (cartItemId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      return true;
    } catch (err) {
      console.error("Failed to remove item from cart:", err);
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('student_id', user.id);

      if (error) throw error;
      setCartItems([]);
      return true;
    } catch (err) {
      console.error("Failed to clear cart:", err);
      return false;
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.product?.price ? Number(item.product.price) : 0;
    return sum + price;
  }, 0);

  const cartCount = cartItems.length;

  return {
    cartItems,
    cartCount,
    totalAmount,
    isLoading,
    fetchCart,
    addToCart,
    removeFromCart,
    clearCart
  };
}
