import React, { useState } from 'react';
import { Product } from '../../types';
import { generateSKU, generateNumericBarcode, renderCode128Svg } from '../../services/skuGenerator';
import { useSettings } from '../../context/SettingsContext';
import { QrCode, Tag, Printer, Sparkles, Check, Copy, RefreshCw, Layers } from 'lucide-react';

interface SkuBarcodeManagerProps {
  products: Product[];
  onUpdateProductSku: (productId: string, sku: string, barcode: string) => void;
  onOpenLabelPrinter: (product: Product) => void;
}

export const SkuBarcodeManager: React.FC<SkuBarcodeManagerProps> = ({
  products,
  onUpdateProductSku,
  onOpenLabelPrinter
}) => {
  const { formatPrice } = useSettings();
  
  // Custom single generator state
  const [testTitle, setTestTitle] = useState('EA Sports FC 25');
  const [testPlatform, setTestPlatform] = useState('PS5');
  const [testCategory, setTestCategory] = useState('DISC');
  const [testSlot, setTestSlot] = useState('');
  const [generatedSku, setGeneratedSku] = useState(() => generateSKU('EA Sports FC 25', 'PS5', 'DISC', ''));
  const [generatedBarcode, setGeneratedBarcode] = useState(() => generateNumericBarcode(Date.now()));
  const [copied, setCopied] = useState(false);

  const handleGenerateCustom = () => {
    const sku = generateSKU(testTitle, testPlatform, testCategory, testSlot);
    const barcode = generateNumericBarcode(Date.now());
    setGeneratedSku(sku);
    setGeneratedBarcode(barcode);
  };

  const handleCopySku = () => {
    navigator.clipboard.writeText(generatedSku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bulk generator for catalog
  const handleBulkGenerate = () => {
    let count = 0;
    products.forEach((p, idx) => {
      if (!p.sku || !p.barcode) {
        const sku = generateSKU(p.name, p.platform || 'PS5', p.categorySlug, '');
        const barcode = generateNumericBarcode(idx + 100);
        onUpdateProductSku(p.id, sku, barcode);
        count++;
      }
    });
    alert(`Generated SKU & Barcodes for ${count} products.`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-black border border-red-500/30">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-wider flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-red-500" />
            <span>Gaming Store SKU & Barcode Studio</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Automated SKU naming convention & Code-128 barcode generation for inventory tagging & shelf labels.
          </p>
        </div>

        <button
          onClick={handleBulkGenerate}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase italic tracking-wider shadow-lg shadow-red-600/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Auto-Generate All Missing SKUs</span>
        </button>
      </div>

      {/* Generator Playground Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
            <span>Interactive SKU Configurator</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform</label>
              <select
                value={testPlatform}
                onChange={(e) => setTestPlatform(e.target.value)}
                className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500"
              >
                <option value="PS5">PlayStation 5 (PS5)</option>
                <option value="PS4">PlayStation 4 (PS4)</option>
                <option value="XBOX">Xbox Series X/S</option>
                <option value="SWITCH">Nintendo Switch</option>
                <option value="PC">PC Gaming</option>
                <option value="ACC">Gaming Accessory</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Asset Category</label>
              <select
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500"
              >
                <option value="HW">Console Hardware (HW)</option>
                <option value="DISC">Physical Game Disc (DISC)</option>
                <option value="DIG">Digital PSN Account (DIG)</option>
                <option value="ACC">Controller / Accessory (ACC)</option>
                <option value="SUB">PS Plus Subscription (SUB)</option>
                <option value="CARD">Wallet Top-up Card (CARD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Product Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Call of Duty Black Ops 6"
                className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Edition / Slot (Optional)</label>
              <select
                value={testSlot}
                onChange={(e) => setTestSlot(e.target.value)}
                className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500"
              >
                <option value="">None / Standard</option>
                <option value="Primary">Primary Slot (PRI)</option>
                <option value="Secondary">Secondary Slot (SEC)</option>
                <option value="Full Account">Full Account (FUL)</option>
                <option value="Used">Pre-owned / Used (USD)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateCustom}
            className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate SKU & Code</span>
          </button>
        </div>

        {/* Live Barcode Result Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/40 px-3 py-1 rounded-full border border-red-800/40">
              Live Preview
            </span>

            <div className="mt-4 p-3 bg-black/60 rounded-2xl border border-white/10 font-mono text-base font-black text-white flex items-center justify-between">
              <span className="truncate">{generatedSku}</span>
              <button
                onClick={handleCopySku}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                title="Copy SKU"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-xs text-gray-400 mt-2 font-mono">
              Barcode: {generatedBarcode}
            </div>

            {/* Rendered SVG Barcode */}
            <div
              className="mt-4 p-3 bg-white rounded-2xl flex items-center justify-center shadow-lg"
              dangerouslySetInnerHTML={{ __html: renderCode128Svg(generatedSku, 260, 75) }}
            />
          </div>

          <div className="w-full pt-4 border-t border-white/10 mt-4">
            <button
              onClick={() => {
                onOpenLabelPrinter({
                  id: 'temp',
                  name: testTitle,
                  sku: generatedSku,
                  barcode: generatedBarcode,
                  price: 3800,
                  cost: 3000,
                  stock: 10,
                  categorySlug: testCategory
                });
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Shelf / Sticker Label</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog SKU Overview Table */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6">
        <h3 className="text-base font-black text-white uppercase italic mb-4">
          Current Inventory SKUs & Barcode Tags ({products.length} Products)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <th className="pb-3">Product Title</th>
                <th className="pb-3">Platform</th>
                <th className="pb-3">SKU</th>
                <th className="pb-3">Barcode</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-bold text-white">{p.name}</td>
                  <td className="py-3 text-gray-400">{p.platform || 'PS5'}</td>
                  <td className="py-3 font-mono text-amber-400">{p.sku || '—'}</td>
                  <td className="py-3 font-mono text-gray-300">{p.barcode || '—'}</td>
                  <td className="py-3 text-right font-mono font-bold text-white">{formatPrice(p.price)}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onOpenLabelPrinter(p)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/15 text-white rounded-lg text-[10px] font-bold"
                    >
                      Print Label
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
