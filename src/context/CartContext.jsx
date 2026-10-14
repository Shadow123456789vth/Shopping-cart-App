import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as cartService from '../services/cartService';
import { computeTotals } from '../utils/format';
import { MAX_QTY_PER_ITEM } from '../config';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true); // true until the first load for this user completes

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const list = await cartService.listCart(user.id);
      setItems(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh().catch(() => setItems([]));
  }, [refresh]);

  const addItem = useCallback(async (product, quantity = 1) => {
    const existing = items.find((i) => i.productId === product.id);
    const limit = Math.min(product.stock, MAX_QTY_PER_ITEM);
    if (existing) {
      const qty = Math.min(existing.quantity + quantity, limit);
      if (qty === existing.quantity) throw new Error(`You already have the maximum quantity (${limit}) in your cart.`);
      await cartService.updateCartItem(existing.id, qty);
    } else {
      await cartService.addCartItem(user.id, product.id, Math.min(quantity, limit));
    }
    await refresh();
  }, [items, user, refresh]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    await cartService.updateCartItem(itemId, quantity);
  }, []);

  const removeItem = useCallback(async (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await cartService.removeCartItem(itemId);
  }, []);

  const clear = useCallback(async () => {
    const current = await cartService.listCart(user.id);
    await Promise.all(current.map((i) => cartService.removeCartItem(i.id)));
    setItems([]);
  }, [user]);

  const value = useMemo(() => ({
    items,
    loading,
    count: items.reduce((n, i) => n + i.quantity, 0),
    totals: computeTotals(items),
    refresh,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  }), [items, loading, refresh, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
