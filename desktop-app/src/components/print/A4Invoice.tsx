import React from 'react';
import { Invoice } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { printInvoice } from '../../services/escpos';
import { Printer, Download, X, FileText } from 'lucide-react';

interface A4InvoiceProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const A4Invoice: React.FC<A4InvoiceProps> = ({ invoice, onClose }) => {
  const { settings, formatPrice } = useSettings();

  if (!invoice) return null;

  const handlePrint = async () => {
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
        className="bg-[#121217] border border-white/10 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-black text-white uppercase italic">
              Official Tax Invoice (فاتورة ضريبية رسمية)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* A4 Sheet Container */}
        <div className="flex-1 overflow-y-auto bg-white text-gray-900 p-8 rounded-2xl shadow-xl font-sans text-xs leading-normal" dir="rtl">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-red-600 pb-4">
            <div>
              <h1 className="text-2xl font-black text-red-600 tracking-tight">{settings.storeName}</h1>
              <div className="text-sm font-bold text-gray-700">{settings.branchName}</div>
              <div className="text-gray-600 mt-1">العنوان: {settings.address}</div>
              <div className="text-gray-600">هاتف: {settings.phone}</div>
              <div className="text-gray-600 font-mono text-[11px]">
                البطاقة الضريبية: <strong>{settings.taxId || '622-400-511'}</strong> | السجل التجاري: <strong>{settings.commercialReg || '104882'}</strong>
              </div>
            </div>

            <div className="text-left" dir="ltr">
              <div className="inline-block bg-red-50 border border-red-200 p-3 rounded-xl text-left">
                <div className="text-[10px] font-black text-red-700 uppercase tracking-widest">OFFICIAL TAX INVOICE</div>
                <div className="text-lg font-black text-red-900 font-mono">#{invoice.orderNumber}</div>
                <div className="text-[11px] text-gray-600">التاريخ: {new Date(invoice.date).toLocaleDateString('en-GB')}</div>
                <div className="text-[11px] text-gray-600">الكاشير: {invoice.cashierName}</div>
              </div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="my-4 p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div><strong>اسم العميل:</strong> {invoice.customer.name}</div>
            <div><strong>رقم الهاتف:</strong> {invoice.customer.phone || 'غير مسجل'}</div>
            {invoice.customer.email && <div><strong>البريد الإلكتروني:</strong> {invoice.customer.email}</div>}
            {invoice.customer.taxNumber && <div><strong>الرقم الضريبي للمشتري:</strong> {invoice.customer.taxNumber}</div>}
          </div>

          {/* Table */}
          <table className="w-full text-right border-collapse border border-gray-200 text-xs">
            <thead>
              <tr className="bg-gray-900 text-white font-bold">
                <th className="p-2 border border-gray-700 w-10 text-center">#</th>
                <th className="p-2 border border-gray-700">بيان الصنف</th>
                <th className="p-2 border border-gray-700 w-16 text-center">الكمية</th>
                <th className="p-2 border border-gray-700 w-24 text-left" dir="ltr">السعر ({settings.currency})</th>
                <th className="p-2 border border-gray-700 w-28 text-left" dir="ltr">الإجمالي ({settings.currency})</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2.5 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    {item.sku && <div className="text-[10px] text-gray-500 font-mono">SKU: {item.sku}</div>}
                    {item.serialNumber && <div className="text-[10px] text-blue-600 font-mono">الرقم التسلسلي (S/N): {item.serialNumber}</div>}
                    {item.selectedSlot && <div className="text-[10px] text-gray-600">النوع: {item.selectedSlot}</div>}
                  </td>
                  <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                  <td className="p-2.5 text-left font-mono" dir="ltr">{item.price.toFixed(2)}</td>
                  <td className="p-2.5 text-left font-mono font-bold" dir="ltr">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end mt-4">
            <table className="w-72 border border-gray-200 text-xs font-medium">
              <tr className="border-b border-gray-200">
                <td className="p-2 text-gray-600">الإجمالي قبل الضريبة:</td>
                <td className="p-2 text-left font-mono font-bold" dir="ltr">{invoice.subtotal.toFixed(2)} {settings.currency}</td>
              </tr>
              {invoice.discountTotal > 0 && (
                <tr className="border-b border-gray-200 text-red-600">
                  <td className="p-2">الخصم الممنوح:</td>
                  <td className="p-2 text-left font-mono font-bold" dir="ltr">-{invoice.discountTotal.toFixed(2)} {settings.currency}</td>
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <td className="p-2 text-gray-600">ضريبة القيمة المضافة ({invoice.taxRate}%):</td>
                <td className="p-2 text-left font-mono font-bold" dir="ltr">{invoice.taxTotal.toFixed(2)} {settings.currency}</td>
              </tr>
              <tr className="bg-red-50 text-red-900 font-black text-sm">
                <td className="p-2.5">صافي الفاتورة:</td>
                <td className="p-2.5 text-left font-mono" dir="ltr">{invoice.total.toFixed(2)} {settings.currency}</td>
              </tr>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-[10px] text-gray-500 flex justify-between items-center">
            <div>طريقة الدفع: <strong>{invoice.payment.method}</strong></div>
            <div className="text-center font-bold text-gray-800">فاتورة إلكترونية معتمدة من {settings.storeName}</div>
            <div>تاريخ الاستخراج: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
