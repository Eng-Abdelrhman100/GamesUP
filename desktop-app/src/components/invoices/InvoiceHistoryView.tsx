import React, { useState, useMemo } from 'react';
import { Invoice } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { printInvoice } from '../../services/escpos';
import { 
  Receipt, 
  Search, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  DollarSign, 
  CreditCard,
  CloudOff,
  User,
  Phone
} from 'lucide-react';

interface InvoiceHistoryViewProps {
  invoices: Invoice[];
  onSelectInvoiceForThermal: (invoice: Invoice) => void;
  onSelectInvoiceForA4: (invoice: Invoice) => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  onSelectInvoiceForThermal,
  onSelectInvoiceForA4
}) => {
  const { settings, formatPrice } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.orderNumber.toLowerCase().includes(q) ||
        inv.customer.name.toLowerCase().includes(q) ||
        (inv.customer.phone && inv.customer.phone.includes(q)) ||
        inv.items.some((i) => i.name.toLowerCase().includes(q));

      const matchMethod = selectedMethod === 'all' || inv.payment.method === selectedMethod;

      return matchSearch && matchMethod;
    });
  }, [invoices, searchQuery, selectedMethod]);

  const totalSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  }, [filteredInvoices]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d11] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5 bg-[#121217] space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-wider flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-500" />
              <span>Invoices & Sales Transactions</span>
              <span className="text-xs font-mono font-bold bg-white/5 text-gray-400 px-2.5 py-1 rounded-xl not-italic ml-2 border border-white/5">
                {invoices.length} Invoices
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Reprint receipts, view order details, and search past gaming transactions.
            </p>
          </div>

          <div className="bg-[#181820] border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400">Total Filtered Sales:</span>
            <span className="text-lg font-black font-mono text-emerald-400">{formatPrice(totalSales)}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, customer name, phone, or game title..."
              className="w-full bg-[#1b1b22] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Credit/Debit Card</option>
            <option value="INSTAPAY">InstaPay</option>
            <option value="VODAFONE_CASH">Vodafone Cash</option>
            <option value="SPLIT">Split Tender</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredInvoices.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Receipt className="w-12 h-12 text-gray-600 mb-2" />
            <div className="text-base font-bold text-gray-400">No invoices recorded yet</div>
            <p className="text-xs text-gray-600 mt-1 max-w-sm">
              Sales completed in the POS terminal will appear here with instant reprint capabilities.
            </p>
          </div>
        ) : (
          <div className="bg-[#121217] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/40 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items Sold</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Reprint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      #{inv.orderNumber}
                    </td>

                    <td className="py-3 px-3 text-gray-400">
                      <div className="flex flex-col">
                        <span>{new Date(inv.date).toLocaleDateString('en-GB')}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-200">{inv.customer.name}</span>
                        {inv.customer.phone && (
                          <span className="text-[10px] text-gray-500 font-mono">{inv.customer.phone}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col max-w-[220px]">
                        <span className="truncate font-semibold text-gray-300">
                          {inv.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {inv.items.reduce((s, i) => s + i.quantity, 0)} total items
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-gray-300">
                        {inv.payment.method}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-white text-sm">
                      {inv.total.toLocaleString()} {settings.currency}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {inv.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <CloudOff className="w-3 h-3" /> Queued
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectInvoiceForThermal(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-[11px] transition-colors"
                          title="Reprint 80mm Thermal Receipt"
                        >
                          <Printer className="w-3 h-3" />
                          <span>80mm</span>
                        </button>

                        <button
                          onClick={() => onSelectInvoiceForA4(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[11px] transition-colors"
                          title="Print A4 Tax Invoice"
                        >
                          <FileText className="w-3 h-3" />
                          <span>A4</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
