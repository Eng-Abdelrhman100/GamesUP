import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { printTestReceipt } from '../../services/escpos';
import { renderCode128Svg } from '../../services/skuGenerator';
import { 
  Settings, 
  Palette, 
  Printer, 
  FileText, 
  ShieldCheck, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Sparkles, 
  Monitor, 
  Volume2, 
  VolumeX,
  CreditCard,
  Save,
  Check
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, taxSettings, updateTaxSettings } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'appearance' | 'printer' | 'invoice_shape' | 'taxes' | 'sync'>('printer');
  
  // Printers detection
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState<{ loading: boolean; success: boolean | null; msg: string | null }>({
    loading: false,
    success: null,
    msg: null
  });

  // Local draft state
  const [formData, setFormData] = useState(settings);
  const [taxData, setTaxData] = useState(taxSettings);
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    setTaxData(taxSettings);
  }, [taxSettings]);

  // Scan OS printers on load
  useEffect(() => {
    scanPrinters();
  }, []);

  const scanPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      if (typeof window !== 'undefined' && window.posHardware?.getPrinters) {
        const list = await window.posHardware.getPrinters();
        setAvailablePrinters(list || []);
      } else {
        setAvailablePrinters([
          { name: 'Xprinter XP-80C (USB Thermal)', isDefault: true },
          { name: 'POS-80 Series Printer', isDefault: false },
          { name: 'Epson TM-T20III', isDefault: false },
          { name: 'Microsoft Print to PDF', isDefault: false }
        ]);
      }
    } catch (err) {
      console.warn('Printer detection error:', err);
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleSaveAll = () => {
    updateSettings(formData);
    updateTaxSettings(taxData);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleTestPrint = async () => {
    setTestPrintStatus({ loading: true, success: null, msg: 'Sending test ticket to thermal printer...' });
    try {
      const res = await printTestReceipt(formData);
      if (res.success) {
        setTestPrintStatus({
          loading: false,
          success: true,
          msg: `Printed successfully on "${formData.thermalPrinterName || 'Default POS Printer'}"!`
        });
      } else {
        setTestPrintStatus({
          loading: false,
          success: false,
          msg: `Printer returned status: ${res.error || 'Failed'}. Check USB cable and paper roll.`
        });
      }
    } catch (err: any) {
      setTestPrintStatus({
        loading: false,
        success: false,
        msg: `Print error: ${err.message || 'Check printer connection'}`
      });
    }
  };

  // Dummy barcode for preview
  const sampleBarcodeSvg = renderCode128Svg('ORD-SAMPLE-99', formData.paperWidth === '58mm' ? 160 : 200, 40);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d11] overflow-hidden select-none">
      {/* Settings Header */}
      <div className="p-6 pb-4 border-b border-white/5 bg-[#121217] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black text-white uppercase italic tracking-wider flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-500" />
            <span>Terminal Settings & Hardware Configuration</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure thermal receipt printers, invoice shapes, themes, Egypt 14% VAT, and website sync.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          {isSavedToast ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          <span>{isSavedToast ? 'Settings Saved!' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* Sub Tabs Bar */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#101014] flex items-center gap-2 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('printer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'printer'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Thermal & USB Printers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoice_shape')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'invoice_shape'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoice Shape & Policies</span>
        </button>

        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'appearance'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance & Audio</span>
        </button>

        <button
          onClick={() => setActiveSubTab('taxes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'taxes'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>VAT & Taxes ({taxData.enabled ? `${taxData.rate}%` : 'OFF'})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'sync'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Cloud & Website Sync</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: PRINTER & HARDWARE */}
        {activeSubTab === 'printer' && (
          <div className="max-w-4xl space-y-6">
            {/* Printer Scanner & Selection */}
            <div className="bg-[#131318] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic">
                      Connected POS & Thermal Printers
                    </h3>
                    <p className="text-xs text-gray-400">
                      Detects all USB, XP-80, XP-58, EPSON ESC/POS, and Windows Spooler devices.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={scanPrinters}
                  disabled={isScanningPrinters}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningPrinters ? 'animate-spin text-red-500' : ''}`} />
                  <span>Scan Printers</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thermal Printer Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1.5 block">
                    Receipt Thermal Printer (طابعة الإيصالات الحرارية)
                  </label>
                  <select
                    value={formData.thermalPrinterName}
                    onChange={(e) => setFormData({ ...formData, thermalPrinterName: e.target.value })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  >
                    <option value="">Default Windows POS Printer</option>
                    {availablePrinters.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Select your Xprinter XP-80/58, POS-80, Epson TM-T20, or USB thermal printer.
                  </p>
                </div>

                {/* A4 Printer Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1.5 block">
                    A4 Official Tax Invoice Printer (طابعة الفواتير A4)
                  </label>
                  <select
                    value={formData.a4PrinterName}
                    onChange={(e) => setFormData({ ...formData, a4PrinterName: e.target.value })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  >
                    <option value="">Default Windows Printer</option>
                    {availablePrinters.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Used when customers request a full sheet A4 tax invoice with company details.
                  </p>
                </div>
              </div>

              {/* Roll Width & Hardware Flags */}
              <div className="pt-2 border-t border-white/5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-2 block">
                    Thermal Paper Roll Width (عرض رول الورق الحراري)
                  </label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.paperWidth === '80mm'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-[#1b1b22] border-white/5 text-gray-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paperWidth"
                          checked={formData.paperWidth === '80mm'}
                          onChange={() => setFormData({ ...formData, paperWidth: '80mm' })}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="font-bold text-xs">80mm Roll (Standard Gaming POS)</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">72mm Printable</span>
                    </label>

                    <label className={`flex-1 flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.paperWidth === '58mm'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-[#1b1b22] border-white/5 text-gray-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paperWidth"
                          checked={formData.paperWidth === '58mm'}
                          onChange={() => setFormData({ ...formData, paperWidth: '58mm' })}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="font-bold text-xs">58mm Roll (Mini Thermal / Mobile)</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">48mm Printable</span>
                    </label>
                  </div>
                </div>

                {/* Hardware check toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1b1b22] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCutPaper}
                      onChange={(e) => setFormData({ ...formData, autoCutPaper: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Auto-Cut Paper</div>
                      <div className="text-[10px] text-gray-500">Sends GS V 66 cutter signal</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1b1b22] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.kickDrawerOnCash}
                      onChange={(e) => setFormData({ ...formData, kickDrawerOnCash: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Cash Drawer Kick</div>
                      <div className="text-[10px] text-gray-500">RJ11 pulse on cash payment</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1b1b22] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.silentPrint}
                      onChange={(e) => setFormData({ ...formData, silentPrint: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Silent Printing</div>
                      <div className="text-[10px] text-gray-500">Instant print without dialog</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* INTERACTIVE PRINTER TEST TOOL */}
            <div className="bg-[#131318] border border-red-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic">
                      Hardware Diagnostic Printer Test (اختبار الطباعة)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Sends an official diagnostic receipt to verify alignment, font styling, barcode clarity, and cutter.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testPrintStatus.loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{testPrintStatus.loading ? 'Testing Printer...' : 'Print Test Receipt (XP / USB)'}</span>
                </button>
              </div>

              {testPrintStatus.msg && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  testPrintStatus.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/30 text-red-300'
                }`}>
                  {testPrintStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span>{testPrintStatus.msg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVOICE SHAPE & POLICIES */}
        {activeSubTab === 'invoice_shape' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Settings (Left 7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Header Info */}
              <div className="bg-[#131318] border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>Store Header Information (بيانات المتجر في الفاتورة)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Store Name (English/Arabic)</label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Branch Name</label>
                    <input
                      type="text"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Store Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Tax Registration # (البطاقة الضريبية)</label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-1 block">Commercial Register (السجل التجاري)</label>
                    <input
                      type="text"
                      value={formData.commercialReg}
                      onChange={(e) => setFormData({ ...formData, commercialReg: e.target.value })}
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Structure Toggles */}
              <div className="bg-[#131318] border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                  Receipt Elements Toggles (عناصر الفاتورة)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showLogoOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showLogoOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print GamesUP Logo Header</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showBarcodeOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showBarcodeOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print Code-128 Barcode</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCashierOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showCashierOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print Cashier Name & Shift</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCustomerOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showCustomerOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print Customer Name & Phone</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showSerialOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showSerialOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print Hardware Serial Numbers (S/N)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCredentialsOnReceipt}
                      onChange={(e) => setFormData({ ...formData, showCredentialsOnReceipt: e.target.checked })}
                      className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    <span>Print Digital Account Credentials</span>
                  </label>
                </div>
              </div>

              {/* Policies & Footer Notes */}
              <div className="bg-[#131318] border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                  Return Policies & Footer Text (الشروط والضمان)
                </h3>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1 block">Warranty & Return Policy</label>
                  <textarea
                    rows={2}
                    value={formData.returnPolicyText}
                    onChange={(e) => setFormData({ ...formData, returnPolicyText: e.target.value })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1 block">Custom Footer Note</label>
                  <input
                    type="text"
                    value={formData.customFooterNote}
                    onChange={(e) => setFormData({ ...formData, customFooterNote: e.target.value })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Interactive Receipt Preview (Right 5 Cols) */}
            <div className="lg:col-span-5 sticky top-0">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                <span>Live Receipt Preview ({formData.paperWidth})</span>
                <span className="text-[10px] text-emerald-400 font-mono">Updates in real-time</span>
              </div>

              <div className="bg-white text-black p-5 rounded-2xl shadow-2xl font-mono text-[11px] leading-relaxed max-w-[340px] mx-auto border-2 border-gray-300">
                {formData.showLogoOnReceipt && (
                  <div className="text-center font-bold text-[10px] tracking-widest uppercase pb-1 text-gray-700">
                    🎮 GAMESUP STORE 🎮
                  </div>
                )}
                <div className="text-center pb-2 border-b border-dashed border-gray-400">
                  <h4 className="font-black text-sm tracking-wider uppercase">{formData.storeName}</h4>
                  <div className="text-[10px] text-gray-600">{formData.branchName}</div>
                  <div className="text-[9px] text-gray-600">{formData.address}</div>
                  <div className="text-[9px] text-gray-600">Tel: {formData.phone}</div>
                  {formData.taxId && <div className="text-[9px] text-gray-600">Tax ID: {formData.taxId}</div>}
                  {formData.commercialReg && <div className="text-[9px] text-gray-600">C.R: {formData.commercialReg}</div>}
                </div>

                <div className="py-2 border-b border-dashed border-gray-400 text-[10px]">
                  <div className="flex justify-between">
                    <span>Inv #: ORD-2026-0042</span>
                    <span>{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  {formData.showCashierOnReceipt && (
                    <div className="flex justify-between">
                      <span>Cashier: Ahmed G.</span>
                      <span>15:30</span>
                    </div>
                  )}
                  {formData.showCustomerOnReceipt && (
                    <div>Customer: Omar Gamal (01023456789)</div>
                  )}
                </div>

                <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>PS5 DualSense Controller</span>
                    <span>4,200.00</span>
                  </div>
                  {formData.showSerialOnReceipt && (
                    <div className="text-[9px] text-gray-600">S/N: GUP-SN-8829101</div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span>FC 25 PS5 Digital Slot</span>
                    <span>1,100.00</span>
                  </div>
                  {formData.showCredentialsOnReceipt && (
                    <div className="text-[9px] bg-gray-100 p-1 rounded">
                      User: fc25.vip@gamesup.store<br/>Pass: FCPlay@2026
                    </div>
                  )}
                </div>

                <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>5,300.00 EGP</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>5,300.00 EGP</span>
                  </div>
                </div>

                {formData.showBarcodeOnReceipt && (
                  <div className="text-center py-2">
                    <div
                      className="flex justify-center"
                      dangerouslySetInnerHTML={{ __html: sampleBarcodeSvg }}
                    />
                  </div>
                )}

                <div className="text-center text-[9px] text-gray-600 pt-1">
                  {formData.returnPolicyText}
                  <div className="font-bold text-black mt-1">{formData.customFooterNote}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: APPEARANCE & AUDIO */}
        {activeSubTab === 'appearance' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#131318] border border-white/5 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-red-500" />
                <span>POS Theme & Visual Styling</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-gray-300 mb-2 block">Theme Palette</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Gaming Dark (Default)', bg: '#0d0d11' },
                    { id: 'oled', label: 'Midnight OLED Black', bg: '#000000' },
                    { id: 'light', label: 'Light Studio Mode', bg: '#ffffff' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme: t.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.theme === t.id
                          ? 'border-red-500 bg-red-600/10 text-white'
                          : 'border-white/5 bg-[#1b1b22] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="w-full h-8 rounded-lg mb-2 border border-white/10" style={{ backgroundColor: t.bg }}></div>
                      <div className="text-xs font-bold">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-gray-300 mb-2 block">Brand Accent Color</label>
                <div className="flex gap-3">
                  {[
                    { color: '#dc2626', name: 'GamesUP Crimson' },
                    { color: '#06b6d4', name: 'Cyberpunk Cyan' },
                    { color: '#10b981', name: 'Neon Emerald' },
                    { color: '#8b5cf6', name: 'Royal Purple' },
                    { color: '#f59e0b', name: 'Amber Gold' }
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setFormData({ ...formData, accentColor: c.color })}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${
                        formData.accentColor === c.color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    >
                      {formData.accentColor === c.color && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effects */}
              <div className="pt-2 border-t border-white/5">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#1b1b22] border border-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    {formData.soundEffects ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
                    <div>
                      <div className="text-xs font-bold text-white">Interactive POS Sound Effects</div>
                      <div className="text-[10px] text-gray-500">Audio feedback on barcode scan, add-to-cart, and checkout complete</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.soundEffects}
                    onChange={(e) => setFormData({ ...formData, soundEffects: e.target.checked })}
                    className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VAT & TAXES */}
        {activeSubTab === 'taxes' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#131318] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic">
                      Value Added Tax (ضريبة القيمة المضافة)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Standard Egypt tax rate is 14%. Pre-configured for gaming consoles & accessories.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={taxData.enabled}
                    onChange={(e) => setTaxData({ ...taxData, enabled: e.target.checked })}
                    className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-white">VAT Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1.5 block">Standard Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxData.rate}
                    onChange={(e) => setTaxData({ ...taxData, rate: Number(e.target.value) })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1.5 block">Tax Name / Label</label>
                  <input
                    type="text"
                    value={taxData.name}
                    onChange={(e) => setTaxData({ ...taxData, name: e.target.value })}
                    className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-gray-300 mb-2 block">Price Tax Calculation Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTaxData({ ...taxData, mode: 'inclusive' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      taxData.mode === 'inclusive'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-[#1b1b22] border-white/5 text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Tax-Inclusive (شامل الضريبة)</div>
                    <div className="text-[10px] text-gray-500 mt-1">Displayed retail prices include 14% VAT</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaxData({ ...taxData, mode: 'exclusive' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      taxData.mode === 'exclusive'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-[#1b1b22] border-white/5 text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Tax-Exclusive (غير شامل الضريبة)</div>
                    <div className="text-[10px] text-gray-500 mt-1">14% VAT is calculated and added at checkout</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CLOUD SYNC & WEBSITE */}
        {activeSubTab === 'sync' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#131318] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase italic">
                    Website Backend & Cloud Synchronization
                  </h3>
                  <p className="text-xs text-gray-400">
                    Connects directly to your live Node.js / MySQL backend at games-up.co.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 mb-1.5 block">API Endpoint Base URL</label>
                <input
                  type="url"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  placeholder="https://admin.games-up.co/api"
                  className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 mb-1.5 block">Admin Access Token (Optional)</label>
                <input
                  type="password"
                  value={formData.apiToken}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  placeholder="Bearer token or leave blank for public POS bridge"
                  className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    fetch(`${formData.apiUrl}/public/products`)
                      .then((r) => r.ok ? alert('Connection successful!') : alert('API returned ' + r.status))
                      .catch((e) => alert('Connection failed: ' + e.message));
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                >
                  Test Server Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
