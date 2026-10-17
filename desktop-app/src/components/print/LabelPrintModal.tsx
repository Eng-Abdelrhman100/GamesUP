import React, { useState } from 'react';
import { Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { renderCode128Svg } from '../../services/skuGenerator';
import { Printer, X, Tag } from 'lucide-react';

interface LabelPrintModalProps {
  product: Product | null;
  onClose: () => void;
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({ product, onClose }) => {
  const { settings, formatPrice } = useSettings();
  const [quantity, setQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'40x30' | '50x25' | '38x25'>('40x30');

  if (!product) return null;

  const sku = product.sku || `GUP-${product.id}`;
  const barcode = product.barcode || sku;
  const barcodeSvg = renderCode128Svg(barcode, 200, 50);

  const handlePrintLabels = () => {
    // Generate printable HTML with repeat for quantity
    const labelItemsHtml = Array.from({ length: quantity }).map(() => `
      <div class="label-card">
        <div class="store-name">${settings.storeName}</div>
        <div class="product-name">${product.name}</div>
        <div class="barcode-box">
          ${barcodeSvg}
        </div>
        <div class="price-row">
          <span class="sku-text">${sku}</span>
          <span class="price-text">${formatPrice(product.price)}</span>
        </div>
      </div>
    `).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Barcode Labels - ${product.name}</title>
        <style>
          @page {
            size: ${labelSize === '40x30' ? '40mm 30mm' : labelSize === '50x25' ? '50mm 25mm' : '38mm 25mm'};
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #fff;
          }
          .label-card {
            width: ${labelSize === '40x30' ? '38mm' : labelSize === '50x25' ? '48mm' : '36mm'};
            height: ${labelSize === '40x30' ? '28mm' : '23mm'};
            padding: 2mm 1mm;
            box-sizing: border-box;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
          }
          .store-name {
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .product-name {
            font-size: 8px;
            font-weight: bold;
            line-height: 1.1;
            max-height: 18px;
            overflow: hidden;
          }
          .barcode-box svg {
            width: 100%;
            height: 28px;
          }
          .price-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-top: 1px solid #000;
            padding-top: 1px;
          }
          .sku-text {
            font-size: 7px;
            font-family: monospace;
          }
          .price-text {
            font-size: 11px;
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        ${labelItemsHtml}
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 400);
    }
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121217] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
              <Tag className="w-4 h-4 text-red-500" />
              <span>Barcode Sticker Label Print</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Print thermal adhesive stickers for boxes & shelves</p>
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


        {/* Live Sticker Preview Card */}
        <div className="p-4 bg-white rounded-2xl text-black shadow-lg flex flex-col justify-between h-48 border border-gray-300">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-wider">{settings.storeName}</div>
            <div className="text-xs font-bold mt-1 line-clamp-1">{product.name}</div>
          </div>

          <div
            className="my-auto flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          />

          <div className="flex justify-between items-baseline pt-2 border-t border-black">
            <span className="text-[10px] font-mono">{sku}</span>
            <span className="text-sm font-black">{formatPrice(product.price)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Label Size</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as any)}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs font-bold text-white"
            >
              <option value="40x30">40mm x 30mm (Standard)</option>
              <option value="50x25">50mm x 25mm (Wide)</option>
              <option value="38x25">38mm x 25mm (Compact)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Copies / Quantity</label>
            <input
              type="number"
              min="1"
              max="500"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs font-bold text-white text-center font-mono"
            />
          </div>
        </div>

        <button
          onClick={handlePrintLabels}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print {quantity} Label{quantity > 1 ? 's' : ''}</span>
        </button>
      </div>
    </div>
  );
};
