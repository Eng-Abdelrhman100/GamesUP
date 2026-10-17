export type ProductType = 'physical' | 'digital' | 'console' | 'accessory' | 'card';

export interface DigitalItem {
  email: string;
  password: string;
  code: string;
  outlookEmail?: string;
  outlookPassword?: string;
  twoFactorCode?: string;
  birthdate?: string;
  region?: string;
  onlineId?: string;
  backupCodes?: string;
  slots?: Record<string, { sold: boolean; orderId: string | null; code: string }>;
  fullAccountSold?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number | null;
  cost: number | null;
  stock: number;
  sku?: string;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  categorySlug: string;
  subCategorySlug?: string;
  price: number;
  cost: number;
  stock: number;
  image?: string;
  sku?: string;
  barcode?: string;
  productType?: ProductType;
  platform?: 'PS5' | 'PS4' | 'XBOX' | 'NINTENDO' | 'PC' | 'GENERAL';
  isTaxable?: boolean;
  requiresSerial?: boolean;
  attributes?: Record<string, any>;
  digitalItems?: DigitalItem[];
  product_variants?: ProductVariant[];
  syncStatus?: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
  lastModified?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost: number;
  quantity: number;
  productType: ProductType;
  isTaxable: boolean;
  selectedVariant?: ProductVariant;
  selectedSlot?: string;
  selectedDigitalItem?: DigitalItem;
  serialNumber?: string;
  customDiscount?: number; // percentage or fixed
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  loyaltyPoints?: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'INSTAPAY' | 'VODAFONE_CASH' | 'SPLIT';

export interface PaymentDetails {
  method: PaymentMethod;
  amountReceived: number;
  changeDue: number;
  splitDetails?: {
    cashAmount: number;
    cardAmount: number;
    instaPayAmount: number;
  };
  referenceNumber?: string;
}

export interface TaxSettings {
  enabled: boolean;
  rate: number; // e.g. 14 for 14%
  name: string; // e.g. "VAT (ضريبة القيمة المضافة)"
  mode: 'inclusive' | 'exclusive'; // inclusive = included in price; exclusive = added at checkout
}

export interface Invoice {
  id: string;
  orderNumber: string;
  date: string;
  cashierName: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxRate: number;
  taxMode: 'inclusive' | 'exclusive';
  total: number;
  payment: PaymentDetails;
  notes?: string;
  shiftId?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface CashShift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCashActual?: number;
  expectedCashTotal: number;
  cashSalesTotal: number;
  cardSalesTotal: number;
  instaPaySalesTotal: number;
  cashDropsTotal: number;
  status: 'OPEN' | 'CLOSED';
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  phone: string;
  taxId: string; // البطاقة الضريبية
  commercialReg: string; // السجل التجاري
  address: string;
  currency: string;
  returnPolicyText: string;
  customFooterNote: string;
  thermalPrinterName: string;
  a4PrinterName: string;
  paperWidth: '80mm' | '58mm';
  autoCutPaper: boolean;
  kickDrawerOnCash: boolean;
  silentPrint: boolean;
  showLogoOnReceipt: boolean;
  showBarcodeOnReceipt: boolean;
  showQrOnReceipt: boolean;
  showCashierOnReceipt: boolean;
  showCustomerOnReceipt: boolean;
  showSerialOnReceipt: boolean;
  showCredentialsOnReceipt: boolean;
  theme: 'dark' | 'light' | 'oled';
  accentColor: string;
  soundEffects: boolean;
  apiUrl: string;
  apiToken: string;
}
