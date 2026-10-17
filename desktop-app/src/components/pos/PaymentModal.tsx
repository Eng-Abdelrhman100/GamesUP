import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useShift } from '../../context/ShiftContext';
import { PaymentMethod, Invoice, PaymentDetails } from '../../types';
import { printInvoice } from '../../services/escpos';
import { posApi } from '../../services/api';
import { Banknote, CreditCard, Smartphone, Split, CheckCircle2, Printer, X, Sparkles } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete: (invoice: Invoice) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSaleComplete }) => {
  const { cart, customer, totals, clearCart } = useCart();
  const { settings, formatPrice } = useSettings();
  const { recordSale, activeShift } = useShift();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(totals.netTotal);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  
  // Split payment state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitInstaPay, setSplitInstaPay] = useState<number>(0);

  // Printing preferences
  const [shouldPrintThermal, setShouldPrintThermal] = useState<boolean>(true);
  const [shouldPrintA4, setShouldPrintA4] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;


  const changeDue = Math.max(0, cashTendered - totals.netTotal);

  // Cash quick preset buttons
  const cashPresets = [
    totals.netTotal,
    Math.ceil(totals.netTotal / 50) * 50,
    Math.ceil(totals.netTotal / 100) * 100,
    Math.ceil(totals.netTotal / 200) * 200,
    Math.ceil(totals.netTotal / 1000) * 1000
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totals.netTotal);

  const handleCompleteSale = async () => {
    setIsProcessing(true);

    try {
      const orderNumber = `GUP-${Date.now().toString().slice(-8)}`;
      
      const paymentDetails: PaymentDetails = {
        method: paymentMethod,
        amountReceived: paymentMethod === 'CASH' ? cashTendered : totals.netTotal,
        changeDue: paymentMethod === 'CASH' ? changeDue : 0,
        referenceNumber: referenceNumber || undefined,
        splitDetails: paymentMethod === 'SPLIT' ? {
          cashAmount: splitCash,
          cardAmount: splitCard,
          instaPayAmount: splitInstaPay
        } : undefined
      };

      const invoice: Invoice = {
        id: `inv_${Date.now()}`,
        orderNumber,
        date: new Date().toISOString(),
        cashierName: activeShift?.cashierName || 'Cashier (الكاشير)',
        customer,
        items: [...cart],
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        taxRate: totals.appliedTaxRate,
        taxMode: settings.taxId ? 'inclusive' : 'exclusive',
        total: totals.netTotal,
        payment: paymentDetails,
        shiftId: activeShift?.id
      };

      // 1. Record sale in shift
      recordSale(totals.netTotal, paymentMethod);

      // 2. Direct Hardware Printing
      if (shouldPrintThermal) {
        await printInvoice(invoice, settings, 'thermal');
      }
      if (shouldPrintA4) {
        await printInvoice(invoice, settings, 'a4');
      }

      // 3. Save to backend / local queue
      await posApi.saveInvoice(invoice);

      // 4. Complete and clear
      clearCart();
      onSaleComplete(invoice);
      onClose();
    } catch (err) {
      console.error('Sale completion error:', err);
      alert('An error occurred completing the sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121217] border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-wider">
              Tender & Finalize Sale
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select payment method and confirm receipt issuance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Total Display Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-black border border-red-500/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount Payable</div>
            <div className="text-xs text-gray-500">Items: {cart.length} • {customer.name}</div>
          </div>
          <div className="text-3xl font-black text-red-500 font-mono tracking-tight">
            {formatPrice(totals.netTotal)}
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Tender</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Cash (كاش)', icon: Banknote },
              { id: 'CARD', label: 'POS Card (فيزا)', icon: CreditCard },
              { id: 'INSTAPAY', label: 'InstaPay', icon: Smartphone },
              { id: 'SPLIT', label: 'Split (مقسم)', icon: Split }
            ].map(m => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setPaymentMethod(m.id as PaymentMethod);
                    if (m.id === 'CASH') setCashTendered(totals.netTotal);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-black">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Payment Body */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cash Received from Customer</label>
              <input
                type="number"
                min="0"
                step="any"
                value={cashTendered || ''}
                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-black border border-white/15 rounded-2xl text-2xl font-black text-white font-mono text-center focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>

            {/* Quick cash presets */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cashPresets.map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => setCashTendered(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    cashTendered === val
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Change Due Box */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400">Change Due (الباقي للعميل)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {formatPrice(changeDue)}
              </span>
            </div>
          </div>
        )}

        {(paymentMethod === 'INSTAPAY' || paymentMethod === 'CARD') && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Reference / Approval Code (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TXN-998821"
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>
        )}

        {paymentMethod === 'SPLIT' && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cash</label>
              <input
                type="number"
                value={splitCash || ''}
                onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-sm font-mono text-white text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Card</label>
              <input
                type="number"
                value={splitCard || ''}
                onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-sm font-mono text-white text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">InstaPay</label>
              <input
                type="number"
                value={splitInstaPay || ''}
                onChange={(e) => setSplitInstaPay(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-sm font-mono text-white text-center"
              />
            </div>
          </div>
        )}

        {/* Print Toggles */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300">
            <input
              type="checkbox"
              checked={shouldPrintThermal}
              onChange={(e) => setShouldPrintThermal(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded"
            />
            <span>Print 80mm Receipt (حراري)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300">
            <input
              type="checkbox"
              checked={shouldPrintA4}
              onChange={(e) => setShouldPrintA4(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded"
            />
            <span>Print Official A4 Invoice (ضريبي)</span>
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCompleteSale}
          disabled={isProcessing || (paymentMethod === 'CASH' && cashTendered < totals.netTotal)}
          className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition-all cursor-pointer"
        >
          {isProcessing ? (
            <span>Printing & Fulfilling...</span>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>Complete Sale & Print Invoice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
