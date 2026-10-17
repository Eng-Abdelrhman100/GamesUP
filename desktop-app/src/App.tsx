import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { ProductCatalog } from './components/pos/ProductCatalog';
import { CartPanel } from './components/pos/CartPanel';
import { PaymentModal } from './components/pos/PaymentModal';
import { ThermalReceipt } from './components/print/ThermalReceipt';
import { A4Invoice } from './components/print/A4Invoice';
import { LabelPrintModal } from './components/print/LabelPrintModal';
import { SkuBarcodeManager } from './components/sku/SkuBarcodeManager';
import { ProductManager } from './components/products/ProductManager';
import { SettingsView } from './components/settings/SettingsView';
import { InvoiceHistoryView } from './components/invoices/InvoiceHistoryView';
import { TaxSettingsModal } from './components/taxes/TaxSettingsModal';
import { ShiftManagerModal } from './components/shifts/ShiftManagerModal';
import { BarcodeListener } from './components/pos/BarcodeListener';
import { useSettings } from './context/SettingsContext';
import { useShift } from './context/ShiftContext';
import { posApi, SEED_GAMING_PRODUCTS } from './services/api';
import { Product, Invoice } from './types';
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [products, setProducts] = useState<Product[]>(SEED_GAMING_PRODUCTS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isThermalReceiptOpen, setIsThermalReceiptOpen] = useState(false);
  const [isA4InvoiceOpen, setIsA4InvoiceOpen] = useState(false);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { settings } = useSettings();
  const { activeShift } = useShift();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Play audio synthesizer feedback for barcode/sale
  const playBeep = useCallback((freq = 800, duration = 80) => {
    if (!settings.soundEffects) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch {}
  }, [settings.soundEffects]);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const items = await posApi.getProducts();
      setProducts(items);
    } catch {
      setProducts(SEED_GAMING_PRODUCTS);
    } finally {
      setIsLoadingProducts(false);
      setPendingSyncCount(posApi.getPendingSyncCount());
    }
  };

  const loadInvoices = () => {
    const list = posApi.getLocalInvoices();
    setInvoices(list);
  };

  // Sync outbox queue to server
  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      showToast('Cannot sync: Terminal is currently offline');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await posApi.syncAllPending();
      if (result.syncedCount > 0) {
        showToast(`Successfully synced ${result.syncedCount} item(s) with the website!`);
        playBeep(980, 120);
      } else if (result.errors.length > 0) {
        showToast(`Sync warning: ${result.errors[0]}`);
      } else {
        showToast('All items are already up to date!');
      }
      await loadProducts();
      loadInvoices();
    } catch (err: any) {
      showToast(`Sync failed: ${err.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
      setPendingSyncCount(posApi.getPendingSyncCount());
    }
  };

  // Initial boot and offline listeners
  useEffect(() => {
    loadProducts();
    loadInvoices();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connection restored: Synchronizing with website...');
      handleSyncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Internet disconnected: Operating in Offline Mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30s
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
      setPendingSyncCount(posApi.getPendingSyncCount());
      if (navigator.onLine && posApi.getPendingSyncCount() > 0) {
        handleSyncAll();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleUpdateProductSku = async (productId: string, sku: string, barcode: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const updated = { ...prod, sku, barcode };
    await posApi.saveProduct(updated, false);
    setProducts(prev => prev.map(p => p.id === productId ? updated : p));
    setPendingSyncCount(posApi.getPendingSyncCount());
    showToast(`Updated SKU: ${sku}`);
  };

  const handleSaveProduct = async (product: Product, isNew: boolean) => {
    const res = await posApi.saveProduct(product, isNew);
    if (isNew) {
      setProducts(prev => [res.product, ...prev.filter(p => p.id !== res.product.id)]);
      showToast(res.offline ? `Product created in offline cache: ${product.name}` : `Product created & synced: ${product.name}`);
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? res.product : p));
      showToast(res.offline ? `Product updated in offline cache: ${product.name}` : `Product updated & synced: ${product.name}`);
    }
    setPendingSyncCount(posApi.getPendingSyncCount());
  };

  const handleDeleteProduct = async (productId: string) => {
    const res = await posApi.deleteProduct(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    setPendingSyncCount(posApi.getPendingSyncCount());
    showToast(res.offline ? 'Product removed (queued for server sync)' : 'Product deleted successfully');
  };

  const handleSaleComplete = async (invoice: Invoice) => {
    playBeep(1200, 150);
    const res = await posApi.saveInvoice(invoice);
    setLastInvoice(invoice);
    setIsThermalReceiptOpen(true);
    loadInvoices();
    setPendingSyncCount(posApi.getPendingSyncCount());
    showToast(res.offline ? `Sale #${invoice.orderNumber} saved (Queued for sync)` : `Sale completed: #${invoice.orderNumber}`);
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'shifts') {
      setIsShiftModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Theme container classes
  const themeBg = settings.theme === 'oled' ? 'bg-black' : settings.theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-[#0a0a0c] text-white';

  return (
    <div className={`flex h-screen w-screen font-sans overflow-hidden select-none ${themeBg}`}>
      {/* Global Background Barcode Listener */}
      <BarcodeListener
        products={products}
        onScanSuccess={(code) => {
          playBeep(880, 90);
          showToast(`Scanned Barcode: ${code}`);
        }}
      />

      {/* Modern Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        onSyncNow={handleSyncAll}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        totalProductsCount={products.length}
      />

      {/* Main Screen Content View */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: POS TERMINAL */}
        {activeTab === 'pos' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            <div className="flex-1 h-full overflow-hidden">
              <ProductCatalog
                products={products}
                isLoading={isLoadingProducts}
              />
            </div>
            <div className="h-full shrink-0">
              <CartPanel
                onOpenPaymentModal={() => setIsPaymentOpen(true)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="flex-1 h-full overflow-hidden">
            <ProductManager
              products={products}
              isLoading={isLoadingProducts}
              onRefresh={loadProducts}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onOpenLabelPrinter={(prod) => setLabelProduct(prod)}
              isOnline={isOnline}
              onSyncAll={handleSyncAll}
            />
          </div>
        )}

        {/* TAB 3: SKU & BARCODE STUDIO */}
        {activeTab === 'sku' && (
          <div className="flex-1 h-full overflow-hidden">
            <SkuBarcodeManager
              products={products}
              onUpdateProductSku={handleUpdateProductSku}
              onOpenLabelPrinter={(prod) => setLabelProduct(prod)}
            />
          </div>
        )}

        {/* TAB 4: INVOICES HISTORY */}
        {activeTab === 'invoices' && (
          <div className="flex-1 h-full overflow-hidden">
            <InvoiceHistoryView
              invoices={invoices}
              onSelectInvoiceForThermal={(inv) => {
                setLastInvoice(inv);
                setIsThermalReceiptOpen(true);
              }}
              onSelectInvoiceForA4={(inv) => {
                setLastInvoice(inv);
                setIsA4InvoiceOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB 5: SETTINGS & HARDWARE CONFIG */}
        {activeTab === 'settings' && (
          <div className="flex-1 h-full overflow-hidden">
            <SettingsView />
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16161d] border border-white/20 text-white px-5 py-3.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSaleComplete={handleSaleComplete}
      />

      {isThermalReceiptOpen && (
        <ThermalReceipt
          invoice={lastInvoice}
          onClose={() => {
            setIsThermalReceiptOpen(false);
            setLastInvoice(null);
          }}
        />
      )}

      {isA4InvoiceOpen && (
        <A4Invoice
          invoice={lastInvoice}
          onClose={() => {
            setIsA4InvoiceOpen(false);
            setLastInvoice(null);
          }}
        />
      )}


      <LabelPrintModal
        product={labelProduct}
        onClose={() => setLabelProduct(null)}
      />

      <TaxSettingsModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
      />

      <ShiftManagerModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />
    </div>
  );
}
