import React from 'react';
import { Invoice } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { printInvoice } from '../../services/escpos';
import { renderCode128Svg } from '../../services/skuGenerator';
import { Printer, FileText, CheckCircle2, X } from 'lucide-react';

interface ThermalReceiptProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ invoice, onClose }) => {
  const { settings, formatPrice } = useSettings();

  if (!invoice) return null;

  const barcodeSvg = renderCode128Svg(invoice.orderNumber, 220, 50);

  const handlePrintThermal = async () => {
    await printInvoice(invoice, settings, 'thermal');
  };

  const handlePrintA4 = async () => {
    await printInvoice(invoice, settings, 'a4');
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121217] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white uppercase italic">Sale Complete</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* 80mm Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto bg-white text-black p-5 rounded-2xl shadow-inner font-sans text-xs leading-relaxed max-w-[340px] mx-auto border border-gray-200">
          {/* Header */}
          <div className="text-center pb-2.5 border-b border-dashed border-gray-400">
            {settings.showLogoOnReceipt && (
              <div className="font-black text-[10px] tracking-widest uppercase text-gray-800 pb-1">
                🎮 GAMESUP GAMING POS 🎮
              </div>
            )}
            <h4 className="font-black text-base tracking-wide uppercase text-black">{settings.storeName}</h4>
            <div className="text-[11px] font-bold text-gray-700">{settings.branchName}</div>
            <div className="text-[10px] text-gray-600">{settings.address}</div>
            <div className="text-[10px] font-semibold text-gray-700">Tel: {settings.phone}</div>
            {settings.taxId && <div className="text-[9.5px] text-gray-600">الرقم الضريبي: <strong>{settings.taxId}</strong></div>}
            {settings.commercialReg && <div className="text-[9.5px] text-gray-600">السجل التجاري: <strong>{settings.commercialReg}</strong></div>}
          </div>

          {/* Receipt Meta */}
          <div className="py-2 border-b border-dashed border-gray-400 text-[10.5px]">
            <div className="flex justify-between items-center">
              <span>Inv #: <strong className="font-mono">{invoice.orderNumber}</strong></span>
              <span className="font-mono text-gray-600">{new Date(invoice.date).toLocaleDateString('en-GB')}</span>
            </div>
            {settings.showCashierOnReceipt && (
              <div className="flex justify-between items-center text-gray-600">
                <span>Cashier: {invoice.cashierName}</span>
                <span className="font-mono">{new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {settings.showCustomerOnReceipt && invoice.customer && invoice.customer.name !== 'Walk-in Customer' && invoice.customer.name !== 'Walk-in Customer (عميل كاش)' && (
              <div className="text-gray-800 font-semibold mt-0.5">
                Customer: {invoice.customer.name} {invoice.customer.phone ? `(${invoice.customer.phone})` : ''}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-2.5 border-b border-dashed border-gray-400 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 border-b border-gray-300 pb-1">
              <span>Item / الصنف</span>
              <div className="flex gap-4">
                <span>Qty</span>
                <span>Price</span>
              </div>
            </div>

            {invoice.items.map(item => (
              <div key={item.id} className="flex justify-between items-start gap-2 pt-1">
                <div className="flex-1 pr-1">
                  <div className="font-bold text-gray-900 leading-tight">{item.name}</div>
                  {item.selectedSlot && (
                    <div className="inline-block text-[9.5px] font-bold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded mt-0.5 border border-gray-300">
                      🎮 {item.selectedSlot}
                    </div>
                  )}
                  {settings.showSerialOnReceipt && item.serialNumber && (
                    <div className="text-[9.5px] font-mono text-blue-800 font-bold mt-0.5">
                      S/N: {item.serialNumber}
                    </div>
                  )}
                  {settings.showCredentialsOnReceipt && item.selectedDigitalItem && (
                    <div className="text-[9.5px] font-mono bg-gray-50 border border-gray-300 p-1.5 mt-1 rounded space-y-0.5">
                      <div><strong>👤 User:</strong> {item.selectedDigitalItem.email}</div>
                      <div><strong>🔑 Pass:</strong> {item.selectedDigitalItem.password}</div>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 font-mono text-[11px]">
                  <div className="text-gray-600 font-bold">x{item.quantity}</div>
                  <div className="font-black text-black">{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{invoice.subtotal.toFixed(2)} {settings.currency}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Discount:</span>
                <span className="font-mono">-{invoice.discountTotal.toFixed(2)} {settings.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 text-[10.5px]">
              <span>VAT ({invoice.taxRate}%):</span>
              <span className="font-mono">{invoice.taxTotal.toFixed(2)} {settings.currency}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1.5 border-t-2 border-b-2 border-black">
              <span>TOTAL:</span>
              <span className="font-mono text-black">{invoice.total.toFixed(2)} {settings.currency}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="py-1.5 border-b border-dashed border-gray-400 text-[10.5px]">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <strong className="font-mono">{invoice.payment.method}</strong>
            </div>
            {invoice.payment.method === 'CASH' && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Paid:</span>
                  <span className="font-mono">{invoice.payment.amountReceived.toFixed(2)} {settings.currency}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Change Due:</span>
                  <span className="font-mono">{invoice.payment.changeDue.toFixed(2)} {settings.currency}</span>
                </div>
              </>
            )}
          </div>

          {/* Barcode & Policy */}
          <div className="pt-2 text-center">
            <div
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <div className="text-[9px] text-gray-600 mt-2 leading-tight">
              {settings.returnPolicyText}
            </div>
            {settings.customFooterNote && (
              <div className="text-[9.5px] font-bold text-black mt-1">
                {settings.customFooterNote}
              </div>
            )}
            <div className="text-[10px] font-black text-black mt-2">
              شكراً لتعاملكم مع جيمز اب • GamesUP!
            </div>

            {/* Visual Cut Line Marker */}
            {settings.autoCutPaper && (
              <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-[9px] font-mono text-gray-400">
                ✂ - - - - - - - - - - - - - - - - - - ✂
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrintThermal}
              className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print 80mm</span>
            </button>

            <button
              onClick={handlePrintA4}
              className="py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Print A4 Invoice</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Done (إنهاء وإغلاق)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
