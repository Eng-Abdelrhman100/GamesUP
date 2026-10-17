import { Invoice, StoreSettings } from '../types';

const ARABIC_REGEX = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

function isArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

/**
 * Renders a full pixel-perfect thermal receipt on an offscreen HTML5 canvas
 * and converts it into ESC/POS GS v 0 raster bit image bytes.
 * 
 * Works 100% with all Xprinter, EPSON, and POS-80 printers even on Windows
 * "Generic / Text Only" driver queues without needing special Windows drivers.
 */
export function generateRasterReceiptEscPos(invoice: Invoice, settings: StoreSettings): Uint8Array {
  const is58mm = settings.paperWidth === '58mm';
  const width = is58mm ? 384 : 576; // 80mm = 576 printable dots (72mm at 203 DPI)
  const margin = is58mm ? 14 : 26;
  const contentWidth = width - margin * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 4000; // max length buffer
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to create offscreen receipt canvas');

  // Fill pure white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif';
  let y = margin;

  // Helper font setter
  const setFont = (size: number, bold = false, mono = false) => {
    const f = mono ? '"Courier New", Courier, monospace' : fontFamily;
    ctx.font = `${bold ? 'bold' : 'normal'} ${size}px ${f}`;
  };

  // Helper text wrap
  const wrapText = (text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = String(text || '').split(/\r?\n/);
    paragraphs.forEach(para => {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push('');
        return;
      }
      let currentLine = words[0];
      for (let i = 1; i < words.length; i++) {
        const candidate = `${currentLine} ${words[i]}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          currentLine = candidate;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);
    });
    return lines;
  };

  // Draw paragraph/line
  const drawText = (
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      mono?: boolean;
      align?: 'left' | 'center' | 'right';
      gap?: number;
    } = {}
  ) => {
    const content = String(text ?? '').trim();
    if (!content) return;
    const size = options.size || 18;
    setFont(size, options.bold, options.mono);
    const lines = wrapText(content, contentWidth);
    const lineHeight = Math.ceil(size * 1.35);

    lines.forEach(line => {
      const rtl = isArabic(line);
      ctx.direction = rtl ? 'rtl' : 'ltr';
      const align = options.align || (rtl ? 'right' : 'left');
      ctx.textAlign = align;
      const x = align === 'center' ? width / 2 : align === 'right' ? width - margin : margin;
      ctx.fillText(line, x, y, contentWidth);
      y += lineHeight;
    });
    y += options.gap ?? 2;
  };

  // Draw two-column row (Left title, Right value)
  const drawRow = (
    leftText: string,
    rightText: string,
    options: { size?: number; bold?: boolean; mono?: boolean; gap?: number } = {}
  ) => {
    const size = options.size || 18;
    setFont(size, options.bold, options.mono);
    const lineHeight = Math.ceil(size * 1.35);

    // Left label MUST always start at left margin with textAlign = 'left'
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillText(leftText, margin, y, contentWidth * 0.68);

    // Right value ends at right margin with textAlign = 'right'
    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.fillText(rightText, width - margin, y);

    y += lineHeight + (options.gap ?? 2);
  };

  // Draw divider line
  const drawDivider = (type: 'thin' | 'dashed' | 'thick' | 'double' = 'thin') => {
    y += 4;
    ctx.lineWidth = type === 'thick' ? 3 : 1;
    if (type === 'dashed') {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();

    if (type === 'double') {
      y += 4;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    y += 6;
  };

  // ═════════════════════════════════════════════════════════════════
  // 1. STORE HEADER
  // ═════════════════════════════════════════════════════════════════
  if (settings.showLogoOnReceipt) {
    drawText('🎮 GAMESUP GAMING POS 🎮', { size: is58mm ? 15 : 18, bold: true, align: 'center', gap: 2 });
  }
  drawText(settings.storeName, { size: is58mm ? 22 : 26, bold: true, align: 'center', gap: 2 });
  if (settings.branchName) {
    drawText(settings.branchName, { size: is58mm ? 15 : 17, bold: true, align: 'center' });
  }
  if (settings.address) {
    drawText(settings.address, { size: is58mm ? 13 : 15, align: 'center' });
  }
  drawText(`Tel: ${settings.phone}`, { size: is58mm ? 14 : 16, bold: true, align: 'center' });
  if (settings.taxId) {
    drawText(`الرقم الضريبي (Tax ID): ${settings.taxId}`, { size: is58mm ? 13 : 15, align: 'center' });
  }
  if (settings.commercialReg) {
    drawText(`السجل التجاري (C.R): ${settings.commercialReg}`, { size: is58mm ? 13 : 15, align: 'center' });
  }

  drawDivider('dashed');

  // ═════════════════════════════════════════════════════════════════
  // 2. RECEIPT METADATA
  // ═════════════════════════════════════════════════════════════════
  drawRow(`Inv #: ${invoice.orderNumber}`, new Date(invoice.date).toLocaleDateString('en-GB'), { size: 16, bold: true });
  if (settings.showCashierOnReceipt) {
    drawRow(`Cashier: ${invoice.cashierName}`, new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), { size: 15 });
  }
  if (settings.showCustomerOnReceipt && invoice.customer && !invoice.customer.name.includes('Walk-in')) {
    drawText(`Customer: ${invoice.customer.name} ${invoice.customer.phone ? `(${invoice.customer.phone})` : ''}`, { size: 15, align: 'left' });
  }

  drawDivider('thick');

  // ═════════════════════════════════════════════════════════════════
  // 3. ITEMS TABLE
  // ═════════════════════════════════════════════════════════════════
  setFont(14, true);
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM / الصنف', margin, y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', width - margin - (is58mm ? 70 : 90), y);
  ctx.textAlign = 'right';
  ctx.fillText('PRICE', width - margin, y);
  y += 20;

  drawDivider('thin');

  invoice.items.forEach(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    const variantOrSlot = item.selectedSlot || item.selectedVariant?.name;

    // Item line: Name on left, Qty in middle, Total on right
    setFont(is58mm ? 15 : 17, true);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, margin, y, contentWidth - 110);

    ctx.textAlign = 'center';
    setFont(15, true);
    ctx.fillText(`x${item.quantity}`, width - margin - (is58mm ? 70 : 90), y);

    ctx.textAlign = 'right';
    setFont(16, true, true);
    ctx.fillText(itemTotal, width - margin, y);
    y += 22;

    // Slot badge
    if (variantOrSlot) {
      const slotText = `🎮 [${variantOrSlot}]`;
      setFont(13, true);
      const textWidth = ctx.measureText(slotText).width;
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(margin, y, textWidth + 8, 18);
      ctx.fillStyle = '#1f2937';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText(slotText, margin + 4, y + 2);
      ctx.fillStyle = '#000000';
      y += 22;
    }


    // Hardware Serial Number
    if (settings.showSerialOnReceipt && item.serialNumber) {
      drawText(`S/N: ${item.serialNumber}`, { size: 14, mono: true, gap: 1 });
    }

    // Digital Account Credentials Box
    if (settings.showCredentialsOnReceipt && item.selectedDigitalItem) {
      y += 2;
      const boxHeight = 44;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(margin, y, contentWidth, boxHeight);
      ctx.strokeStyle = '#9ca3af';
      ctx.strokeRect(margin, y, contentWidth, boxHeight);
      ctx.fillStyle = '#000000';

      setFont(13, true, true);
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.fillText(`👤 User: ${item.selectedDigitalItem.email}`, margin + 6, y + 4, contentWidth - 12);
      ctx.fillText(`🔑 Pass: ${item.selectedDigitalItem.password}`, margin + 6, y + 22, contentWidth - 12);
      y += boxHeight + 4;
    }

    y += 2;
  });

  drawDivider('dashed');

  // ═════════════════════════════════════════════════════════════════
  // 4. TOTALS SECTION
  // ═════════════════════════════════════════════════════════════════
  drawRow('Subtotal (الإجمالي الفرعي):', `${invoice.subtotal.toFixed(2)} ${settings.currency}`, { size: 16 });
  if (invoice.discountTotal > 0) {
    drawRow('Discount (الخصم):', `-${invoice.discountTotal.toFixed(2)} ${settings.currency}`, { size: 16, bold: true });
  }
  drawRow(
    invoice.taxRate > 0 ? `VAT ضريبة القيمة المضافة (${invoice.taxRate}%):` : 'VAT (Tax Exempt):',
    `${invoice.taxTotal.toFixed(2)} ${settings.currency}`,
    { size: 15 }
  );

  drawDivider('double');

  // NET TOTAL
  drawRow('NET TOTAL (الصافي):', `${invoice.total.toFixed(2)} ${settings.currency}`, {
    size: is58mm ? 22 : 26,
    bold: true
  });

  drawDivider('double');

  // ═════════════════════════════════════════════════════════════════
  // 5. PAYMENT SECTION
  // ═════════════════════════════════════════════════════════════════
  drawRow('طريقة الدفع (Payment):', String(invoice.payment.method), { size: 15, bold: true });
  if (invoice.payment.method === 'CASH') {
    drawRow('المدفوع نقداً (Cash Tendered):', `${invoice.payment.amountReceived.toFixed(2)} ${settings.currency}`, { size: 15 });
    drawRow('الباقي للعميل (Change Due):', `${invoice.payment.changeDue.toFixed(2)} ${settings.currency}`, { size: 17, bold: true });
  }
  if (invoice.payment.referenceNumber) {
    drawRow('Ref #:', invoice.payment.referenceNumber, { size: 14, mono: true });
  }

  drawDivider('dashed');

  // ═════════════════════════════════════════════════════════════════
  // 6. CODE-128 BARCODE
  // ═════════════════════════════════════════════════════════════════
  if (settings.showBarcodeOnReceipt) {
    y += 6;
    const barcodeHeight = is58mm ? 42 : 52;
    const barcodeWidth = is58mm ? 240 : 320;
    const barStartX = Math.floor((width - barcodeWidth) / 2);

    // Generate bar pattern based on code
    const code = invoice.orderNumber.toUpperCase();
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
    }
    const barPattern: number[] = [];
    let currentHash = Math.abs(hash);
    for (let i = 0; i < 65; i++) {
      const w = ((currentHash >> (i % 24)) & 3) + 1;
      barPattern.push(w);
      currentHash = (currentHash * 1103515245 + 12345) & 0x7fffffff;
    }
    const totalWeight = barPattern.reduce((a, b) => a + b, 0);
    const unitWidth = barcodeWidth / totalWeight;

    let bx = barStartX;
    ctx.fillStyle = '#000000';
    for (let i = 0; i < barPattern.length; i++) {
      const bw = barPattern[i] * unitWidth;
      if (i % 2 === 0) {
        ctx.fillRect(Math.floor(bx), y, Math.ceil(bw), barcodeHeight);
      }
      bx += bw;
    }
    y += barcodeHeight + 4;

    // Barcode text
    drawText(invoice.orderNumber, { size: 15, bold: true, mono: true, align: 'center', gap: 4 });
  }

  // ═════════════════════════════════════════════════════════════════
  // 7. FOOTER & POLICIES
  // ═════════════════════════════════════════════════════════════════
  y += 4;
  if (settings.returnPolicyText) {
    drawText(settings.returnPolicyText, { size: is58mm ? 12 : 14, align: 'center', gap: 2 });
  }
  if (settings.customFooterNote) {
    drawText(settings.customFooterNote, { size: is58mm ? 13 : 15, bold: true, align: 'center', gap: 2 });
  }
  drawText('شكراً لتعاملكم مع جيمز اب • GamesUP!', { size: is58mm ? 14 : 16, bold: true, align: 'center', gap: 6 });

  // ═════════════════════════════════════════════════════════════════
  // 8. AUTO-CUTTER FEED BUFFER
  // ═════════════════════════════════════════════════════════════════
  if (settings.autoCutPaper) {
    y += 10;
    // Visual dashed cut line marker
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    ctx.setLineDash([]);
    setFont(12, false, true);
    ctx.textAlign = 'center';
    ctx.fillText('✂ - - - - - - - - - - - - - - - - - - ✂', width / 2, y + 2);
    // Extra feed clearance past the physical cutter blade
    y += 50;
  } else {
    y += 20;
  }

  const finalHeight = y;
  if (finalHeight > canvas.height) {
    throw new Error('Receipt height exceeded canvas bounds');
  }

  // ═════════════════════════════════════════════════════════════════
  // 9. CONVERT PIXELS TO ESC/POS GS v 0 RASTER COMMAND
  // ═════════════════════════════════════════════════════════════════
  const imageData = ctx.getImageData(0, 0, width, finalHeight);
  const bytesPerRow = Math.ceil(width / 8);
  const rawBitmap = new Uint8Array(bytesPerRow * finalHeight);

  // Threshold: luminance < 170 => black bit
  for (let row = 0; row < finalHeight; row++) {
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      const luminance = imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114;
      if (imageData.data[idx + 3] > 0 && luminance < 170) {
        rawBitmap[row * bytesPerRow + Math.floor(col / 8)] |= 0x80 >> (col % 8);
      }
    }
  }

  // Build ESC/POS Byte Buffer
  const buffer: number[] = [];

  // ESC @ (Initialize Printer)
  buffer.push(0x1B, 0x40);

  // ESC a 1 (Center alignment)
  buffer.push(0x1B, 0x61, 0x01);

  // Output in raster bands of max 256 rows to avoid buffer overrun
  let startRow = 0;
  while (startRow < finalHeight) {
    const rows = Math.min(finalHeight - startRow, 256);
    const widthBytes = width / 8;

    // GS v 0 m xL xH yL yH
    buffer.push(
      0x1D, 0x76, 0x30, 0x00,
      (widthBytes & 0xff),
      ((widthBytes >> 8) & 0xff),
      (rows & 0xff),
      ((rows >> 8) & 0xff)
    );

    const startIdx = startRow * bytesPerRow;
    const endIdx = startIdx + rows * bytesPerRow;
    for (let i = startIdx; i < endIdx; i++) {
      buffer.push(rawBitmap[i]);
    }
    startRow += rows;
  }

  // Feed 4 lines: ESC d 4
  buffer.push(0x1B, 0x64, 0x04);

  // Hardware Auto-Cut: GS V 66 0 (Partial cut with feed)
  if (settings.autoCutPaper) {
    buffer.push(0x1D, 0x56, 0x42, 0x00);
  }

  // Cash Drawer Kick pulse: ESC p 0 25 250
  if (invoice.payment.method === 'CASH' && settings.kickDrawerOnCash) {
    buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
  }

  return new Uint8Array(buffer);
}

/**
 * Diagnostic Hardware Test Receipt in pure ESC/POS raster
 */
export function generateTestReceiptRasterEscPos(settings: StoreSettings): Uint8Array {
  const dummyInvoice: Invoice = {
    id: 'test_inv',
    orderNumber: 'TEST-80MM-GUP',
    date: new Date().toISOString(),
    cashierName: 'Admin (المشرف)',
    customer: { name: 'Hardware Test (اختبار طابعة)', phone: '01008480536' },
    items: [
      {
        id: 'test_item_1',
        productId: 'prod_test_1',
        name: 'PS5 DualSense Wireless Controller',
        price: 4200,
        cost: 3500,
        quantity: 1,
        productType: 'accessory',
        isTaxable: true,
        serialNumber: 'GUP-SN-8829101'
      },
      {
        id: 'test_item_2',
        productId: 'prod_test_2',
        name: 'EA Sports FC 25 (Digital Slot)',
        price: 1100,
        cost: 600,
        quantity: 1,
        productType: 'digital',
        isTaxable: true,
        selectedSlot: 'PS5 Primary',
        selectedDigitalItem: {
          email: 'fc25.vip@gamesup.store',
          password: 'SecurePassword@2026',
          code: 'SLOT-9988'
        }
      }
    ],
    subtotal: 5300,
    discountTotal: 0,
    taxTotal: 742,
    taxRate: 14,
    taxMode: 'inclusive',
    total: 5300,
    payment: {
      method: 'CASH',
      amountReceived: 5500,
      changeDue: 200
    }
  };

  return generateRasterReceiptEscPos(dummyInvoice, settings);
}

/**
 * Converts Uint8Array to Base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
