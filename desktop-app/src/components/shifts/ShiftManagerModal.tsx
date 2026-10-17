import React, { useState } from 'react';
import { useShift } from '../../context/ShiftContext';
import { useSettings } from '../../context/SettingsContext';
import { Wallet, LogIn, LogOut, ArrowDownRight, CheckCircle2, AlertTriangle, Printer, X } from 'lucide-react';

interface ShiftManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftManagerModal: React.FC<ShiftManagerModalProps> = ({ isOpen, onClose }) => {
  const { activeShift, openShift, recordCashDrop, closeShift } = useShift();
  const { formatPrice, settings } = useSettings();

  // Open shift inputs
  const [cashierName, setCashierName] = useState('Omar Cashier');
  const [openingFloat, setOpeningFloat] = useState<number>(2000);

  // Cash drop input
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState<string>('');

  // Close shift input
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closedResult, setClosedResult] = useState<{ variance: number; shift: any } | null>(null);

  if (!isOpen) return null;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    openShift(cashierName.trim() || 'Cashier', openingFloat);
  };

  const handleRecordDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (dropAmount > 0) {
      recordCashDrop(dropAmount, dropReason || 'Store Expense');
      setDropAmount(0);
      setDropReason('');
      alert('Cash drop recorded.');
    }
  };

  const handleCloseShift = () => {
    if (window.confirm('Are you sure you want to close the current register shift?')) {
      const res = closeShift(countedCash);
      setClosedResult(res);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121217] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-white uppercase italic flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-500" />
              <span>Cash Register & Shift Management</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Control opening float, petty cash drops, and Z-report closing</p>
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


        {/* If closed report was just generated */}
        {closedResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-base font-black text-white uppercase">Shift Closed (Z-Report)</h4>
              <p className="text-xs text-gray-400">Register drawer closed successfully</p>
            </div>

            <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Float:</span>
                <span className="text-white">{formatPrice(closedResult.shift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Cash Sales:</span>
                <span className="text-emerald-400">+{formatPrice(closedResult.shift.cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Card Sales:</span>
                <span className="text-blue-400">{formatPrice(closedResult.shift.cardSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total InstaPay Sales:</span>
                <span className="text-purple-400">{formatPrice(closedResult.shift.instaPaySalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cash Drops / Expenses:</span>
                <span className="text-red-400">-{formatPrice(closedResult.shift.cashDropsTotal)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                <span className="text-gray-300">Expected Drawer Cash:</span>
                <span className="text-white">{formatPrice(closedResult.shift.expectedCashTotal)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-300">Actual Counted Cash:</span>
                <span className="text-white">{formatPrice(closedResult.shift.closingCashActual)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-white/10">
                <span>Variance (العجز / الزيادة):</span>
                <span className={closedResult.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {closedResult.variance >= 0 ? `+${formatPrice(closedResult.variance)}` : formatPrice(closedResult.variance)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setClosedResult(null);
                onClose();
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Done & Dismiss
            </button>
          </div>
        ) : !activeShift ? (
          /* Open Shift Form */
          <form onSubmit={handleOpenShift} className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>No active register shift open. Enter opening float cash to begin ringing up sales.</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cashier Name</label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-xl text-xs font-bold text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Opening Float Cash (العهدة الافتتاحية في الدرج)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={openingFloat || ''}
                onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                placeholder="2000"
                className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-xl font-black font-mono text-center text-emerald-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Open Register Shift</span>
            </button>
          </form>
        ) : (
          /* Active Shift Dashboard */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="text-[10px] text-gray-400 font-sans">Active Cashier</div>
                <div className="text-sm font-bold text-white mt-0.5">{activeShift.cashierName}</div>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="text-[10px] text-gray-400 font-sans">Shift Start</div>
                <div className="text-xs font-bold text-gray-300 mt-1">
                  {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Shift Financial Overview */}
            <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Float:</span>
                <span className="text-white">{formatPrice(activeShift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cash Sales:</span>
                <span className="text-emerald-400">+{formatPrice(activeShift.cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Card (Visa) Sales:</span>
                <span className="text-blue-400">+{formatPrice(activeShift.cardSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">InstaPay Sales:</span>
                <span className="text-purple-400">+{formatPrice(activeShift.instaPaySalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cash Drops (Out):</span>
                <span className="text-red-400">-{formatPrice(activeShift.cashDropsTotal)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm">
                <span className="text-gray-300">Expected in Drawer:</span>
                <span className="text-emerald-400">{formatPrice(activeShift.expectedCashTotal)}</span>
              </div>
            </div>

            {/* Petty Cash Drop Section */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Record Cash Out / Drop</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={dropAmount || ''}
                  onChange={(e) => setDropAmount(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1.5 bg-black border border-white/10 rounded-xl text-xs font-mono text-white"
                />
                <input
                  type="text"
                  placeholder="Reason (e.g. Supplies)"
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-black border border-white/10 rounded-xl text-xs text-white"
                />
                <button
                  onClick={handleRecordDrop}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold"
                >
                  Record
                </button>
              </div>
            </div>

            {/* Close Shift / Z-Report Drawer Count */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Count Actual Drawer Cash for Z-Report
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={countedCash || ''}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  placeholder="Counted cash in drawer"
                  className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-xl text-lg font-black font-mono text-center text-white"
                />
              </div>

              <button
                onClick={handleCloseShift}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Reconcile & Close Register Shift (Z-Report)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
