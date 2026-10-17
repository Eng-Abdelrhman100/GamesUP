import React, { createContext, useContext, useState, useMemo } from 'react';
import { CartItem, Customer, Product, ProductVariant, DigitalItem } from '../types';
import { useSettings } from './SettingsContext';
import { calculateOrderTotals, CalculationResult } from '../services/taxCalculator';

interface CartContextType {
  cart: CartItem[];
  customer: Customer;
  discountAmount: number;
  discountType: 'flat' | 'percent';
  taxOverride: boolean; // Toggle tax ON/OFF per order
  totals: CalculationResult;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant, slotName?: string, digitalItem?: DigitalItem, serialNumber?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  updateItemSerial: (cartItemId: string, serial: string) => void;
  setCustomer: (cust: Customer) => void;
  setDiscount: (amount: number, type: 'flat' | 'percent') => void;
  toggleTaxOverride: () => void;
  setTaxOverride: (enabled: boolean) => void;
  clearCart: () => void;
  scanBarcode: (code: string, products: Product[]) => boolean;
}

const DEFAULT_CUSTOMER: Customer = {
  name: 'Walk-in Customer (عميل كاش)',
  phone: '',
  email: ''
};

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { taxSettings } = useSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(DEFAULT_CUSTOMER);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [taxOverride, setTaxOverrideState] = useState<boolean>(taxSettings.enabled);

  const addItem = (
    product: Product,
    quantity: number = 1,
    variant?: ProductVariant,
    slotName?: string,
    digitalItem?: DigitalItem,
    serialNumber?: string
  ) => {
    setCart(prev => {
      // Find matching item
      const itemKey = `${product.id}_${variant?.id || slotName || 'base'}_${serialNumber || ''}`;
      const existingIdx = prev.findIndex(item => item.id === itemKey);

      const effectivePrice = variant?.price !== null && variant?.price !== undefined ? variant.price : product.price;
      const effectiveCost = variant?.cost !== null && variant?.cost !== undefined ? variant.cost : product.cost;

      if (existingIdx >= 0 && !slotName && !serialNumber) {
        // Increment quantity for physical/general non-serialized items
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity
        };
        return updated;
      }

      // Add new cart item
      const newItem: CartItem = {
        id: itemKey,
        productId: product.id,
        name: product.name,
        sku: variant?.sku || product.sku,
        barcode: variant?.barcode || product.barcode,
        price: effectivePrice,
        cost: effectiveCost,
        quantity: quantity,
        productType: product.productType || (slotName ? 'digital' : 'physical'),
        isTaxable: product.isTaxable !== false,
        selectedVariant: variant,
        selectedSlot: slotName,
        selectedDigitalItem: digitalItem,
        serialNumber: serialNumber
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: newQty } : item));
  };

  const updateItemSerial = (cartItemId: string, serial: string) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, serialNumber: serial } : item));
  };

  const setDiscount = (amount: number, type: 'flat' | 'percent') => {
    setDiscountAmount(amount);
    setDiscountType(type);
  };

  const toggleTaxOverride = () => {
    setTaxOverrideState(prev => !prev);
  };

  const setTaxOverride = (enabled: boolean) => {
    setTaxOverrideState(enabled);
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(DEFAULT_CUSTOMER);
    setDiscountAmount(0);
    setDiscountType('flat');
    setTaxOverrideState(taxSettings.enabled);
  };

  const scanBarcode = (code: string, products: Product[]): boolean => {
    const clean = code.trim().toLowerCase();
    const found = products.find(p => {
      const pBarcode = (p.barcode || '').toLowerCase();
      const pSku = (p.sku || '').toLowerCase();
      const vBarcode = p.product_variants?.some(v => (v.barcode || '').toLowerCase() === clean);
      const vSku = p.product_variants?.some(v => (v.sku || '').toLowerCase() === clean);
      return pBarcode === clean || pSku === clean || vBarcode || vSku;
    });

    if (found) {
      addItem(found, 1);
      return true;
    }
    return false;
  };

  const totals = useMemo(() => {
    return calculateOrderTotals(cart, taxSettings, taxOverride, discountAmount, discountType);
  }, [cart, taxSettings, taxOverride, discountAmount, discountType]);

  return (
    <CartContext.Provider value={{
      cart,
      customer,
      discountAmount,
      discountType,
      taxOverride,
      totals,
      addItem,
      removeItem,
      updateQuantity,
      updateItemSerial,
      setCustomer,
      setDiscount,
      toggleTaxOverride,
      setTaxOverride,
      clearCart,
      scanBarcode
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
