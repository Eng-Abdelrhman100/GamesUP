import React, { useState, useEffect } from 'react';
import { Product, ProductType, DigitalItem, ProductVariant } from '../../types';
import { generateSKU, generateNumericBarcode } from '../../services/skuGenerator';
import { 
  X, 
  Save, 
  Sparkles, 
  Barcode, 
  Tag, 
  Layers, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  Gamepad2, 
  Key, 
  Hash,
  Image as ImageIcon
} from 'lucide-react';

interface ProductEditModalProps {
  isOpen: boolean;
  product: Product | null; // null if creating new
  onClose: () => void;
  onSave: (product: Product, isNew: boolean) => Promise<void>;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  product,
  onClose,
  onSave
}) => {
  const isNew = !product;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState('physical-games');
  const [platform, setPlatform] = useState<'PS5' | 'PS4' | 'XBOX' | 'NINTENDO' | 'PC' | 'GENERAL'>('PS5');
  const [productType, setProductType] = useState<ProductType>('physical');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [stock, setStock] = useState<number>(1);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [requiresSerial, setRequiresSerial] = useState(false);

  // Digital details
  const [digitalEmail, setDigitalEmail] = useState('');
  const [digitalPassword, setDigitalPassword] = useState('');
  const [digitalCode, setDigitalCode] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setCategorySlug(product.categorySlug || 'physical-games');
      setPlatform(product.platform || 'PS5');
      setProductType(product.productType || 'physical');
      setPrice(product.price || 0);
      setCost(product.cost || 0);
      setStock(product.stock ?? 0);
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setImage(product.image || '');
      setIsTaxable(product.isTaxable !== false);
      setRequiresSerial(!!product.requiresSerial);

      if (product.digitalItems && product.digitalItems[0]) {
        const item = product.digitalItems[0];
        setDigitalEmail(item.email || '');
        setDigitalPassword(item.password || '');
        setDigitalCode(item.code || '');
      } else {
        setDigitalEmail('');
        setDigitalPassword('');
        setDigitalCode('');
      }
    } else {
      // Defaults for new product
      setName('');
      setDescription('');
      setCategorySlug('physical-games');
      setPlatform('PS5');
      setProductType('physical');
      setPrice(0);
      setCost(0);
      setStock(10);
      setSku('');
      setBarcode('');
      setImage('');
      setIsTaxable(true);
      setRequiresSerial(false);
      setDigitalEmail('');
      setDigitalPassword('');
      setDigitalCode('');
    }
    setError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Live Auto-generate SKU
  const handleAutoGenerateSku = () => {
    const generated = generateSKU(name || 'Game Item', platform, categorySlug, productType);
    setSku(generated);
  };

  // Live Auto-generate Barcode
  const handleAutoGenerateBarcode = () => {
    const generated = generateNumericBarcode(sku || name || Date.now());
    setBarcode(generated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (price < 0) {
      setError('Price cannot be negative');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const finalSku = sku.trim() || generateSKU(name, platform, categorySlug, productType);
      const finalBarcode = barcode.trim() || generateNumericBarcode(finalSku);

      let digitalItems: DigitalItem[] | undefined = undefined;
      let product_variants: ProductVariant[] | undefined = undefined;

      if (productType === 'digital') {
        digitalItems = [
          {
            email: digitalEmail,
            password: digitalPassword,
            code: digitalCode || `SLOT-${Math.floor(1000 + Math.random() * 9000)}`,
            slots: {
              'PS4 Primary': { sold: false, orderId: null, code: `PRI-PS4-${Date.now().toString().slice(-4)}` },
              'PS5 Primary': { sold: false, orderId: null, code: `PRI-PS5-${Date.now().toString().slice(-4)}` },
              'Secondary': { sold: false, orderId: null, code: `SEC-${Date.now().toString().slice(-4)}` }
            }
          }
        ];
        product_variants = [
          { id: `v_${Date.now()}_1`, name: 'PS4 Primary', price: Math.round(price * 0.9), cost: Math.round(cost * 0.9), stock: 1 },
          { id: `v_${Date.now()}_2`, name: 'PS5 Primary', price: price, cost: cost, stock: 1 },
          { id: `v_${Date.now()}_3`, name: 'Secondary', price: Math.round(price * 0.65), cost: Math.round(cost * 0.65), stock: 1 }
        ];
      }

      const productPayload: Product = {
        id: product ? product.id : `prod_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        categorySlug,
        platform,
        productType,
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock),
        sku: finalSku,
        barcode: finalBarcode,
        image: image.trim(),
        isTaxable,
        requiresSerial,
        digitalItems,
        product_variants
      };

      await onSave(productPayload, isNew);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const profit = price - cost;
  const marginPct = price > 0 ? Math.round((profit / price) * 100) : 0;

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
        className="bg-[#131318] border border-white/10 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-wider">
                {isNew ? 'Add New Product' : 'Edit Product'}
              </h2>
              <p className="text-xs text-gray-400">
                {isNew ? 'Create item and sync immediately with website & offline DB' : `Editing SKU: ${sku || product?.id}`}
              </p>
            </div>
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


        {/* Error alert */}
        {error && (
          <div className="mt-3 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* 1. Basic Info */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <span>Product Title & Identity</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PlayStation 5 Pro Console / EA Sports FC 25"
              className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          {/* Category & Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1.5 block">Category</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="consoles">Consoles & Hardware (أجهزة)</option>
                <option value="physical-games">Physical Games (ألعاب ديسك)</option>
                <option value="digital-games">Digital Accounts (ألعاب ديجيتال)</option>
                <option value="accessories">Accessories (إكسسوارات ودراعات)</option>
                <option value="playstation-plus">PlayStation Plus (اشتراكات بلس)</option>
                <option value="gift-cards">Gift Cards & Wallet (كروت شحن)</option>
                <option value="services">Maintenance & Services (صيانة وخدمات)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1.5 block">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="PS5">PlayStation 5</option>
                <option value="PS4">PlayStation 4</option>
                <option value="XBOX">Xbox Series / One</option>
                <option value="NINTENDO">Nintendo Switch</option>
                <option value="PC">PC Gaming</option>
                <option value="GENERAL">General / Multi-Platform</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1.5 block">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
                className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="physical">Physical Disc / Item</option>
                <option value="digital">Digital Account / Slots</option>
                <option value="console">Console Hardware (Serial)</option>
                <option value="accessory">Accessory</option>
                <option value="card">Prepaid Gift Card</option>
              </select>
            </div>
          </div>

          {/* Pricing & Stock Card */}
          <div className="bg-[#181820] border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Pricing & Inventory</span>
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-400">Profit: <strong className="text-emerald-400 font-mono">+{profit.toLocaleString()} EGP</strong></span>
                <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold text-[10px]">
                  {marginPct}% Margin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-1 block">Selling Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-1 block">Cost Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-300 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-1 block">Current Stock</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* SKU & Barcode Generator Section */}
          <div className="bg-[#181820] border border-white/5 rounded-2xl p-4 space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-red-500" />
              <span>SKU & Barcode Identification</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SKU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-400">SKU Code</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSku}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Gen SKU
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="GUP-PS5-DISC-001"
                  className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500 uppercase"
                />
              </div>

              {/* Barcode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-400">Barcode (EAN-13 / Code 128)</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcode}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Gen EAN-13
                  </button>
                </div>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="6224005100018"
                  className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Checkboxes: Serial & Taxable */}
            <div className="flex flex-wrap gap-4 pt-1 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={requiresSerial}
                  onChange={(e) => setRequiresSerial(e.target.checked)}
                  className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                />
                <span className="text-gray-300">Requires Serial Number (S/N) at Checkout (Consoles & VR)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isTaxable}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                  className="rounded border-gray-600 text-red-600 focus:ring-red-500"
                />
                <span className="text-gray-300">Subject to 14% VAT (Uncheck for Gift Cards & Tax Exempt)</span>
              </label>
            </div>
          </div>

          {/* Digital Accounts Credentials (Conditional) */}
          {productType === 'digital' && (
            <div className="bg-[#181820] border border-blue-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-wider">
                <Key className="w-4 h-4" />
                <span>Digital Account Credentials & Slots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1 block">Account Email / PSN</label>
                  <input
                    type="email"
                    value={digitalEmail}
                    onChange={(e) => setDigitalEmail(e.target.value)}
                    placeholder="game.account@gamesup.store"
                    className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1 block">Account Password</label>
                  <input
                    type="text"
                    value={digitalPassword}
                    onChange={(e) => setDigitalPassword(e.target.value)}
                    placeholder="SecuredPassword@2026"
                    className="w-full bg-[#131318] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                Digital slots (PS4 Primary, PS5 Primary, Secondary) will be automatically generated with secure redemption codes.
              </p>
            </div>
          )}

          {/* Image URL */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 mb-1 block flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image URL / Thumbnail</span>
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/... or /uploads/..."
              className="w-full bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : isNew ? 'Create & Sync' : 'Update & Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
