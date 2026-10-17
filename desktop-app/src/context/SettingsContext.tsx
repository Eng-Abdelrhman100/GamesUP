import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreSettings, TaxSettings } from '../types';

interface SettingsContextType {
  settings: StoreSettings;
  taxSettings: TaxSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  updateTaxSettings: (newTaxes: Partial<TaxSettings>) => void;
  formatPrice: (amount: number) => string;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'GAMESUP STORE',
  branchName: 'Main Gaming Branch (فرع النزهة)',
  phone: '01008480536',
  taxId: '622-400-511',
  commercialReg: '104882',
  address: 'Cairo, Egypt • متخصصون في أجهزة وألعاب الفيديو',
  currency: 'EGP',
  returnPolicyText: 'الأجهزة الإلكترونية خاضعة لضمان الوكيل • الاستبدال بالفاتورة خلال 14 يوماً للألعاب المختومة',
  customFooterNote: 'شكراً لتسوقكم من جيمز اب! تابعونا على games-up.co',
  thermalPrinterName: '',
  a4PrinterName: '',
  paperWidth: '80mm',
  autoCutPaper: true,
  kickDrawerOnCash: true,
  silentPrint: true,
  showLogoOnReceipt: true,
  showBarcodeOnReceipt: true,
  showQrOnReceipt: true,
  showCashierOnReceipt: true,
  showCustomerOnReceipt: true,
  showSerialOnReceipt: true,
  showCredentialsOnReceipt: true,
  theme: 'dark',
  accentColor: '#dc2626',
  soundEffects: true,
  apiUrl: 'https://admin.games-up.co/api',
  apiToken: ''
};

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  rate: 14, // 14% Egypt standard VAT
  name: 'VAT (ضريبة القيمة المضافة)',
  mode: 'inclusive' // Default: displayed prices are tax inclusive
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('gamesup_pos_settings');
    return saved ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_STORE_SETTINGS;
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => {
    const saved = localStorage.getItem('gamesup_pos_tax_settings');
    return saved ? { ...DEFAULT_TAX_SETTINGS, ...JSON.parse(saved) } : DEFAULT_TAX_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('gamesup_pos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gamesup_pos_tax_settings', JSON.stringify(taxSettings));
  }, [taxSettings]);

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateTaxSettings = (newTaxes: Partial<TaxSettings>) => {
    setTaxSettings(prev => ({ ...prev, ...newTaxes }));
  };

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settings.currency}`;
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      taxSettings,
      updateSettings,
      updateTaxSettings,
      formatPrice
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
