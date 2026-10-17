import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Trash2, Plus, Minus, User, Receipt, Percent, Tag, ArrowRight, ShieldCheck, Hash } from 'lucide-react';

interface CartPanelProps {
  onOpenPaymentModal: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({ onOpenPaymentModal }) => {
  const {
    cart,
    customer,
    setCustomer,
    updateQuantity,
    removeItem,
    updateItemSerial,
    clearCart,
    totals,
    taxOverride,
    toggleTaxOverride,
    discountAmount,
    discountType,
    setDiscount
  } = useCart();

  const { formatPrice, taxSettings } = useSettings();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState(customer.name);
  const [customerPhoneInput, setCustomerPhoneInput] = useState(customer.phone);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValInput, setDiscountValInput] = useState(discountAmount);
  const [discountTypeInput, setDiscountTypeInput] = useState<'flat' | 'percent'>(discountType);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomer({
      ...customer,
      name: customerNameInput.trim() || 'Walk-in Customer',
      phone: customerPhoneInput.trim()
    });
    setShowCustomerModal(false);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setDiscount(discountValInput, discountTypeInput);
    setShowDiscountModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121217] w-full max-w-md xl:max-w-lg border-l border-white/5">
      {/* Top Header & Customer Quick Select */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
        <button
          onClick={() => setShowCustomerModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-left max-w-[260px]"
        >
          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{customer.name}</div>
            <div className="text-[10px] text-gray-400 truncate">{customer.phone || 'Click to set phone/name'}</div>
          </div>
        </button>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all"
            title="Clear Cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
              <Receipt className="w-8 h-8 opacity-40 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-300">Register Cart Empty</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Scan product barcode or click items from catalog to start a sale.
            </p>
          </div>
        ) : (
          cart.map(item => {
            const itemTotal = item.price * item.quantity;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white leading-snug truncate">
                      {item.name}
                    </h5>
                    
                    {/* Variant or slot */}
                    {item.selectedSlot && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-800/40">
                        {item.selectedSlot}
                      </span>
                    )}

                    {/* Serial Number entry for hardware */}
                    {(item.productType === 'console' || item.productType === 'accessory') && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-amber-500 shrink-0" />
                        <input
                          type="text"
                          value={item.serialNumber || ''}
                          onChange={(e) => updateItemSerial(item.id, e.target.value)}
                          placeholder="Serial / IMEI #"
                          className="w-full px-2 py-1 bg-black/50 border border-white/10 rounded-md text-[10px] text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {/* Tax Exempt notice */}
                    {!item.isTaxable && (
                      <span className="inline-block mt-1 text-[9px] text-gray-500 uppercase tracking-widest">
                        Tax Exempt
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-white font-mono">
                      {formatPrice(itemTotal)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {formatPrice(item.price)} each
                    </div>
                  </div>
                </div>

                {/* Quantity and Actions Bar */}
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black text-white px-2 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-500 hover:text-red-400 p-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tax & Discount Quick Action Row */}
      <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between gap-3">
        {/* Dynamic Tax Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTaxOverride}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              taxOverride
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-950/50'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VAT {taxSettings.rate}%: {taxOverride ? 'ON' : 'OFF'}</span>
          </button>
          <span className="text-[10px] text-gray-500">({taxSettings.mode})</span>
        </div>

        {/* Discount Button */}
        <button
          onClick={() => setShowDiscountModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            discountAmount > 0
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          <Percent className="w-3 h-3" />
          <span>{discountAmount > 0 ? `-${discountAmount}${discountType === 'percent' ? '%' : ' ' + useSettings().settings.currency}` : 'Discount'}</span>
        </button>
      </div>

      {/* Financial Summary & Checkout */}
      <div className="p-4 bg-black/60 border-t border-white/10 space-y-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span>Subtotal</span>
          <span className="text-white font-mono">{formatPrice(totals.subtotal)}</span>
        </div>

        {totals.discountTotal > 0 && (
          <div className="flex justify-between text-xs text-red-400 font-medium">
            <span>Discount Applied</span>
            <span className="font-mono">-{formatPrice(totals.discountTotal)}</span>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span>
            {totals.appliedTaxRate > 0 ? `VAT (${totals.appliedTaxRate}%)` : 'Tax (Exempt)'}
          </span>
          <span className="text-white font-mono">{formatPrice(totals.taxTotal)}</span>
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
          <span className="text-sm font-black text-white uppercase italic tracking-wider">Net Total</span>
          <span className="text-2xl font-black text-red-500 font-mono tracking-tight">
            {formatPrice(totals.netTotal)}
          </span>
        </div>

        {/* Primary Checkout Button */}
        <button
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="w-full mt-3 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Tender & Complete Sale (F4)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Info Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-[#16161d] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h4 className="text-base font-black text-white mb-4 uppercase italic">Customer Details</h4>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  placeholder="e.g. Ahmed Mahmoud"
                  className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={customerPhoneInput}
                  onChange={(e) => setCustomerPhoneInput(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveDiscount} className="bg-[#16161d] border border-white/10 rounded-2xl max-w-xs w-full p-6 shadow-2xl">
            <h4 className="text-base font-black text-white mb-4 uppercase italic">Order Discount</h4>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setDiscountTypeInput('flat')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    discountTypeInput === 'flat' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Amount (EGP)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountTypeInput('percent')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    discountTypeInput === 'percent' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValInput || ''}
                  onChange={(e) => setDiscountValInput(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-base font-black font-mono text-center"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDiscount(0, 'flat');
                  setShowDiscountModal(false);
                }}
                className="px-3 py-2 text-gray-400 hover:text-red-400 text-xs font-bold mr-auto"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
