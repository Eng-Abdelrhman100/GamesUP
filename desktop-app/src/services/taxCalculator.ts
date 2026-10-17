import { CartItem, TaxSettings } from '../types';

export interface CalculationResult {
  subtotal: number;
  discountTotal: number;
  taxableSubtotal: number;
  taxExemptSubtotal: number;
  taxTotal: number;
  netTotal: number;
  appliedTaxRate: number;
  isTaxApplied: boolean;
}

export function calculateOrderTotals(
  items: CartItem[],
  taxSettings: TaxSettings,
  taxOverrideEnabled?: boolean, // If provided, cashier explicitly toggled tax on/off
  discountAmount: number = 0,
  discountType: 'flat' | 'percent' = 'flat'
): CalculationResult {
  // 1. Calculate base subtotal
  const rawSubtotal = items.reduce((acc, item) => {
    return acc + (item.price * item.quantity);
  }, 0);

  // 2. Calculate discount
  let discountTotal = 0;
  if (discountType === 'percent') {
    discountTotal = (rawSubtotal * Math.min(100, Math.max(0, discountAmount))) / 100;
  } else {
    discountTotal = Math.min(rawSubtotal, Math.max(0, discountAmount));
  }

  const subtotalAfterDiscount = Math.max(0, rawSubtotal - discountTotal);

  // Determine if tax should be computed
  const isTaxApplied = taxOverrideEnabled !== undefined ? taxOverrideEnabled : taxSettings.enabled;
  const rate = isTaxApplied ? taxSettings.rate : 0;

  let taxableSum = 0;
  let taxExemptSum = 0;

  items.forEach(item => {
    const itemSubtotal = item.price * item.quantity;
    if (item.isTaxable !== false) {
      taxableSum += itemSubtotal;
    } else {
      taxExemptSum += itemSubtotal;
    }
  });

  // Scale discount proportionally between taxable and exempt items
  const discountRatio = rawSubtotal > 0 ? (rawSubtotal - discountTotal) / rawSubtotal : 1;
  const effectiveTaxableBase = taxableSum * discountRatio;
  const effectiveTaxExemptBase = taxExemptSum * discountRatio;

  let taxTotal = 0;
  let netTotal = subtotalAfterDiscount;

  if (isTaxApplied && rate > 0) {
    if (taxSettings.mode === 'inclusive') {
      // Prices already include tax (14% VAT embedded)
      // Base = Price / (1 + Rate / 100)
      // Tax = Price - Base
      const baseBeforeTax = effectiveTaxableBase / (1 + rate / 100);
      taxTotal = effectiveTaxableBase - baseBeforeTax;
      netTotal = subtotalAfterDiscount; // Total doesn't increase, tax is just broken down
    } else {
      // Prices are exclusive; tax added on top
      taxTotal = (effectiveTaxableBase * rate) / 100;
      netTotal = subtotalAfterDiscount + taxTotal;
    }
  }

  return {
    subtotal: Math.round(rawSubtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxableSubtotal: Math.round(effectiveTaxableBase * 100) / 100,
    taxExemptSubtotal: Math.round(effectiveTaxExemptBase * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    netTotal: Math.round(netTotal * 100) / 100,
    appliedTaxRate: isTaxApplied ? rate : 0,
    isTaxApplied
  };
}
