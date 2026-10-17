import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { ShieldCheck, Percent, HelpCircle, Check, X, FileText } from 'lucide-react';

interface TaxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxSettingsModal: React.FC<TaxSettingsModalProps> = ({ isOpen, onClose }) => {
  const { taxSettings, updateTaxSettings, settings, updateSettings, formatPrice } = useSettings();

  const [enabled, setEnabled] = useState(taxSettings.enabled);
  const [rate, setRate] = useState(taxSettings.rate);
  const [mode, setMode] = useState<'inclusive' | 'exclusive'>(taxSettings.mode);
  const [taxName, setTaxName] = useState(taxSettings.name);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [commercialReg, setCommercialReg] = useState(settings.commercialReg);

  if (!isOpen) return null;

  const handleSave = () => {
    updateTaxSettings({
      enabled,
      rate,
      mode,
      name: taxName
    });
    updateSettings({
      taxId,
      commercialReg
    });
    onClose();
  };

  // Live simulation with 1,000 EGP sample item
  const sampleAmount = 1000;
  let sampleTax = 0;
  let sampleTotal = sampleAmount;

  if (enabled && rate > 0) {
    if (mode === 'inclusive') {
      const base = sampleAmount / (1 + rate / 100);
      sampleTax = sampleAmount - base;
      sampleTotal = sampleAmount;
    } else {
      sampleTax = (sampleAmount * rate) / 100;
      sampleTotal = sampleAmount + sampleTax;
    }
  }

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
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Tax Configuration & VAT Engine</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Configure Egypt 14% VAT, tax-inclusive vs exclusive pricing</p>
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


        {/* Master Tax Enable/Disable Switch */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Enable Value Added Tax (VAT)</div>
            <div className="text-xs text-gray-400 mt-0.5">Toggle tax calculation across POS receipts</div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
              enabled ? 'bg-emerald-600 justify-end' : 'bg-white/10 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
          </button>
        </div>

        {/* Tax Mode Selection */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Tax Inclusion Mode (طريقة احتساب الضريبة)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('inclusive')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                mode === 'inclusive'
                  ? 'bg-red-600/20 border-red-500 text-white shadow-lg'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-black text-white mb-1">Tax Inclusive (شامل)</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                Store shelf prices already include VAT. Receipt shows tax breakdown.
              </div>
            </button>

            <button
              onClick={() => setMode('exclusive')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                mode === 'exclusive'
                  ? 'bg-red-600/20 border-red-500 text-white shadow-lg'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-black text-white mb-1">Tax Exclusive (غير شامل)</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                Store prices are net. +14% VAT is calculated and added on checkout.
              </div>
            </button>
          </div>
        </div>

        {/* Tax Rate & Legal IDs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Standard VAT Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs font-bold font-mono text-white text-center"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Tax ID (البطاقة الضريبية)
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="622-400-511"
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs font-bold text-white font-mono"
            />
          </div>
        </div>

        {/* Live Simulation Card */}
        <div className="p-3.5 bg-black/50 border border-white/10 rounded-2xl">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Live Calculation Example (Sample 1,000 EGP Item)</span>
            <span className="text-emerald-400">{mode.toUpperCase()} MODE</span>
          </div>
          <div className="flex justify-between text-xs text-gray-300">
            <span>Tax Amount ({rate}%):</span>
            <span className="font-mono font-bold text-white">{formatPrice(sampleTax)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>Customer Pays Total:</span>
            <span className="font-mono font-black text-red-400 text-sm">{formatPrice(sampleTotal)}</span>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase italic tracking-wider shadow-lg shadow-red-600/30 transition-all cursor-pointer"
        >
          Save Tax Settings
        </button>
      </div>
    </div>
  );
};
