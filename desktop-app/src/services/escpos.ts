import { Invoice, StoreSettings } from '../types';
import { renderCode128Svg } from './skuGenerator';
import {
  generateRasterReceiptEscPos,
  generateTestReceiptRasterEscPos,
  uint8ArrayToBase64
} from './receiptRaster';

declare global {
  interface Window {
    posHardware?: {
      getPrinters: () => Promise<any[]>;
      printReceipt: (payload: { printerName?: string; silent?: boolean; htmlContent: string; paperWidth?: '80mm' | '58mm'; autoCut?: boolean }) => Promise<{ success: boolean; errorType?: string }>;
      printRaw?: (payload: { printerName?: string; base64Data: string }) => Promise<{ success: boolean; errorType?: string }>;
      printA4Invoice: (payload: { printerName?: string; silent?: boolean; htmlContent: string }) => Promise<{ success: boolean; errorType?: string }>;
      openCashDrawer: (payload: { printerName?: string }) => Promise<{ success: boolean }>;
      isDesktop?: boolean;
    };
  }
}

/**
 * Builds ESC/POS compatible thermal receipt HTML (80mm or 58mm)
 */
export function buildThermalReceiptHtml(invoice: Invoice, settings: StoreSettings): string {
  const is58mm = settings.paperWidth === '58mm';
  const pageWidth = is58mm ? '48mm' : '72mm';
  const baseFontSize = is58mm ? '10px' : '11.5px';
  const titleFontSize = is58mm ? '15px' : '17px';
  const barcodeWidth = is58mm ? 160 : 210;
  const barcodeHeight = is58mm ? 40 : 48;

  const barcodeSvg = settings.showBarcodeOnReceipt ? renderCode128Svg(invoice.orderNumber, barcodeWidth, barcodeHeight) : '';

  const itemsHtml = invoice.items.map(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    const variantOrSlot = item.selectedSlot || item.selectedVariant?.name;

    return `
      <tr style="border-bottom: 1px dotted #ccc;">
        <td style="padding: 4px 0; text-align: left; vertical-align: top;">
          <div style="font-weight: 800; font-size: ${is58mm ? '11px' : '12.5px'}; color: #000;">${item.name}</div>
          ${variantOrSlot ? `
            <div style="display: inline-block; font-size: ${is58mm ? '9px' : '10px'}; font-weight: 700; background: #e5e7eb; color: #1f2937; padding: 1px 4px; border-radius: 3px; margin: 2px 0;">
              🎮 ${variantOrSlot}
            </div>
          ` : ''}
          ${settings.showSerialOnReceipt && item.serialNumber ? `
            <div style="font-size: ${is58mm ? '9px' : '10px'}; font-family: monospace; color: #1e3a8a; font-weight: 600;">
              S/N: ${item.serialNumber}
            </div>
          ` : ''}
          ${settings.showCredentialsOnReceipt && item.selectedDigitalItem ? `
            <div style="font-size: ${is58mm ? '9px' : '10px'}; font-family: monospace; background: #f3f4f6; border: 1px solid #d1d5db; padding: 3px 5px; margin-top: 3px; border-radius: 4px;">
              <div><strong>👤 User:</strong> ${item.selectedDigitalItem.email}</div>
              <div><strong>🔑 Pass:</strong> ${item.selectedDigitalItem.password}</div>
            </div>
          ` : ''}
        </td>
        <td style="padding: 4px 0; text-align: center; vertical-align: top; font-size: ${is58mm ? '10px' : '11px'}; font-weight: 700;">x${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 800; font-size: ${is58mm ? '11px' : '12px'}; font-family: monospace;">${itemTotal}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt ${invoice.orderNumber}</title>
      <style>
        @page {
          margin: 0;
          size: ${settings.paperWidth || '80mm'} auto;
        }
        body {
          margin: 0;
          padding: ${is58mm ? '4px 6px' : '8px 10px 4px 10px'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: ${baseFontSize};
          color: #000;
          background: #fff;
          width: ${pageWidth};
          line-height: 1.35;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .mono { font-family: 'Courier New', Courier, monospace; }
        .divider {
          border-top: 1px dashed #000;
          margin: 5px 0;
        }
        .double-divider {
          border-top: 2px solid #000;
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals-row td {
          padding: 2px 0;
        }
        .barcode-container {
          margin: 6px 0 2px 0;
          text-align: center;
        }
        .cut-buffer {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="text-center">
        ${settings.showLogoOnReceipt ? `
          <div style="font-weight: 900; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #111; margin-bottom: 2px;">
            🎮 GAMESUP GAMING POS 🎮
          </div>
        ` : ''}
        <h2 style="margin: 0; font-size: ${titleFontSize}; font-weight: 900; letter-spacing: 0.5px;">${settings.storeName}</h2>
        <div style="font-size: ${is58mm ? '9px' : '11px'}; font-weight: 600; margin-top: 1px;">${settings.branchName}</div>
        <div style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #333;">${settings.address}</div>
        <div style="font-size: ${is58mm ? '9px' : '10.5px'}; font-weight: 600;">Tel: ${settings.phone}</div>
        ${settings.taxId ? `<div style="font-size: ${is58mm ? '8.5px' : '10px'};">الرقم الضريبي (Tax ID): <strong>${settings.taxId}</strong></div>` : ''}
        ${settings.commercialReg ? `<div style="font-size: ${is58mm ? '8.5px' : '10px'};">السجل التجاري (C.R): <strong>${settings.commercialReg}</strong></div>` : ''}
      </div>

      <div class="divider"></div>

      <!-- Receipt Meta -->
      <table style="font-size: ${is58mm ? '9px' : '10.5px'};">
        <tr>
          <td><strong>Inv #:</strong> <span class="mono bold">${invoice.orderNumber}</span></td>
          <td class="text-right mono">${new Date(invoice.date).toLocaleDateString('en-GB')}</td>
        </tr>
        ${settings.showCashierOnReceipt ? `
          <tr>
            <td><strong>Cashier:</strong> ${invoice.cashierName}</td>
            <td class="text-right mono">${new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        ` : ''}
        ${settings.showCustomerOnReceipt && invoice.customer && invoice.customer.name !== 'Walk-in Customer' && invoice.customer.name !== 'Walk-in Customer (عميل كاش)' ? `
          <tr>
            <td colspan="2" style="padding-top: 2px;">
              <strong>Customer:</strong> ${invoice.customer.name} ${invoice.customer.phone ? `(${invoice.customer.phone})` : ''}
            </td>
          </tr>
        ` : ''}
      </table>

      <div class="divider"></div>

      <!-- Items Table -->
      <table>
        <thead>
          <tr style="border-bottom: 1.5px solid #000; font-size: ${is58mm ? '9px' : '10.5px'}; font-weight: 800;">
            <th style="text-align: left; padding-bottom: 3px;">Item / الصنف</th>
            <th style="text-align: center; width: ${is58mm ? '25px' : '35px'}; padding-bottom: 3px;">Qty</th>
            <th style="text-align: right; width: ${is58mm ? '50px' : '65px'}; padding-bottom: 3px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <!-- Totals Summary -->
      <table class="totals-row" style="font-size: ${is58mm ? '10px' : '11.5px'};">
        <tr>
          <td>Subtotal (الإجمالي الفرعي):</td>
          <td class="text-right mono">${invoice.subtotal.toFixed(2)} ${settings.currency}</td>
        </tr>
        ${invoice.discountTotal > 0 ? `
          <tr style="color: #b91c1c; font-weight: bold;">
            <td>Discount (الخصم):</td>
            <td class="text-right mono">-${invoice.discountTotal.toFixed(2)} ${settings.currency}</td>
          </tr>
        ` : ''}
        <tr>
          <td>${invoice.taxRate > 0 ? `VAT ضريبة القيمة المضافة (${invoice.taxRate}%):` : 'VAT (Tax Exempt):'}</td>
          <td class="text-right mono">${invoice.taxTotal.toFixed(2)} ${settings.currency}</td>
        </tr>
        <tr style="font-size: ${is58mm ? '12px' : '14px'}; font-weight: 900; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000;">
          <td style="padding: 4px 0;">NET TOTAL (الصافي):</td>
          <td class="text-right mono" style="padding: 4px 0;">${invoice.total.toFixed(2)} ${settings.currency}</td>
        </tr>
      </table>

      <!-- Payment info -->
      <div style="margin-top: 5px; padding: 4px 0; border-bottom: 1px dashed #000; font-size: ${is58mm ? '9px' : '10.5px'};">
        <table style="width: 100%;">
          <tr>
            <td>طريقة الدفع (Payment):</td>
            <td class="text-right"><strong>${invoice.payment.method}</strong></td>
          </tr>
          ${invoice.payment.method === 'CASH' ? `
            <tr>
              <td>المدفوع نقداً (Cash Tendered):</td>
              <td class="text-right mono">${invoice.payment.amountReceived.toFixed(2)} ${settings.currency}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td>الباقي للعميل (Change Due):</td>
              <td class="text-right mono"><strong>${invoice.payment.changeDue.toFixed(2)} ${settings.currency}</strong></td>
            </tr>
          ` : ''}
          ${invoice.payment.referenceNumber ? `
            <tr>
              <td>Ref #:</td>
              <td class="text-right mono">${invoice.payment.referenceNumber}</td>
            </tr>
          ` : ''}
        </table>
      </div>

      <!-- Barcode / Policy -->
      ${barcodeSvg ? `
        <div class="barcode-container">
          ${barcodeSvg}
        </div>
      ` : ''}

      <div class="text-center" style="font-size: ${is58mm ? '8.5px' : '9.5px'}; margin-top: 6px; line-height: 1.4;">
        <div style="color: #333; font-weight: 500;">${settings.returnPolicyText}</div>
        ${settings.customFooterNote ? `<div style="margin-top: 3px; font-weight: 700; color: #111;">${settings.customFooterNote}</div>` : ''}
        <div style="font-weight: 900; margin-top: 4px; font-size: ${is58mm ? '9.5px' : '11px'}; color: #000;">
          شكراً لتعاملكم مع جيمز اب • GamesUP!
        </div>
      </div>

      <!-- Paper Feed Clearance for Auto-Cutter -->
      ${settings.autoCutPaper ? `
        <div class="cut-buffer" style="margin-top: 8px; padding-top: 18mm; border-top: 1px dashed #aaa; text-align: center; font-size: 8px; color: #888; font-family: monospace;">
          ✂ - - - - - - - - - - - - - - - - - - ✂
        </div>
        <div style="height: 6mm;"></div>
      ` : `
        <div style="height: 8mm;"></div>
      `}
    </body>
    </html>
  `.trim();
}

/**
 * Builds ESC/POS Diagnostic Test Receipt HTML for XP and USB Thermal Printers
 */
export function buildTestReceiptHtml(settings: StoreSettings): string {
  const is58mm = settings.paperWidth === '58mm';
  const pageWidth = is58mm ? '48mm' : '72mm';
  const testBarcode = renderCode128Svg('TEST-80MM-GUP', is58mm ? 160 : 220, is58mm ? 40 : 50);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Printer Diagnostic Test</title>
      <style>
        @page {
          margin: 0;
          size: ${settings.paperWidth || '80mm'} auto;
        }
        body {
          margin: 0;
          padding: 8px 10px;
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: ${is58mm ? '10px' : '12px'};
          color: #000;
          background: #fff;
          width: ${pageWidth};
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin: 0; font-size: ${is58mm ? '14px' : '18px'}; font-weight: 900;">*** HARDWARE TEST ***</h2>
        <div style="font-weight: bold; font-size: 11px; margin-top: 2px;">${settings.storeName}</div>
        <div style="font-size: 10px;">${settings.branchName}</div>
      </div>

      <div class="double-divider"></div>

      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">PRINTER CONFIGURATION:</div>
      <table style="font-size: 10px;">
        <tr>
          <td><strong>Printer:</strong></td>
          <td class="text-right">${settings.thermalPrinterName || 'Windows Default'}</td>
        </tr>
        <tr>
          <td><strong>Roll Width:</strong></td>
          <td class="text-right">${settings.paperWidth}</td>
        </tr>
        <tr>
          <td><strong>Auto-Cut:</strong></td>
          <td class="text-right">${settings.autoCutPaper ? 'ENABLED [OK]' : 'DISABLED'}</td>
        </tr>
        <tr>
          <td><strong>Drawer Kick:</strong></td>
          <td class="text-right">${settings.kickDrawerOnCash ? 'ENABLED [OK]' : 'DISABLED'}</td>
        </tr>
        <tr>
          <td><strong>Date / Time:</strong></td>
          <td class="text-right">${new Date().toLocaleString('en-GB')}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">FONT STYLES TEST:</div>
      <div style="font-size: 10px;">Normal Text: 1234567890 ABCDEFG</div>
      <div style="font-size: 10px; font-weight: bold;">Bold Text: GAMESUP GAMING POS</div>
      <div style="font-size: 12px; font-weight: bold;">Large Text: 14% EGYPT VAT READY</div>

      <div class="divider"></div>

      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">ALIGNMENT TEST:</div>
      <div style="text-align: left; font-size: 10px;">[LEFT ALIGNED]</div>
      <div style="text-align: center; font-size: 10px;">[CENTER ALIGNED]</div>
      <div style="text-align: right; font-size: 10px;">[RIGHT ALIGNED]</div>

      <div class="divider"></div>

      <div class="text-center">
        <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">BARCODE CODE-128 TEST:</div>
        ${testBarcode}
        <div style="font-size: 9px; margin-top: 2px;">TEST-80MM-GUP</div>
      </div>

      <div class="double-divider"></div>

      <div class="text-center" style="font-size: 10px; font-weight: bold;">
        PRINTER STATUS: OPERATIONAL [OK]<br/>
        XP / USB / POS-80 ESC-POS DRIVER TEST PASSED
      <div style="text-align: center; font-size: 9px; margin-top: 8px; color: #444;">
        GamesUP Desktop Terminal • Built for High Performance
      </div>

      <!-- Cutter Feed & Blade Marker -->
      <div style="margin-top: 8px; padding-top: 18mm; border-top: 1px dashed #aaa; text-align: center; font-size: 8px; font-family: monospace;">
        ✂ - - - - - AUTO-CUTTER BLADE LINE - - - - - ✂
      </div>
      <div style="height: 6mm;"></div>
    </body>
    </html>
  `.trim();
}

/**
 * Builds A4 Official Tax Invoice HTML
 */
export function buildA4InvoiceHtml(invoice: Invoice, settings: StoreSettings): string {
  const itemsRows = invoice.items.map((item, idx) => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px;">
          <div style="font-weight: 600;">${item.name}</div>
          ${item.sku ? `<div style="font-size: 11px; color: #6b7280;">SKU: ${item.sku}</div>` : ''}
          ${item.serialNumber ? `<div style="font-size: 11px; color: #6b7280;">S/N: ${item.serialNumber}</div>` : ''}
          ${item.selectedDigitalItem ? `<div style="font-size: 11px; color: #4b5563;">Account: ${item.selectedDigitalItem.email}</div>` : ''}
        </td>
        <td style="padding: 10px; text-align: center;">${item.productType.toUpperCase()}</td>
        <td style="padding: 10px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right;">${item.price.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; font-weight: 600;">${itemTotal}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice ${invoice.orderNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #111827;
          background: #fff;
          margin: 0;
          font-size: 13px;
        }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 16px;">
        <div>
          <h1 style="margin: 0; color: #dc2626; font-size: 26px; font-weight: 900;">${settings.storeName}</h1>
          <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">${settings.branchName}</div>
          <div style="font-size: 12px; color: #4b5563;">${settings.address}</div>
          <div style="font-size: 12px; color: #4b5563;">Tel: ${settings.phone}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 22px; font-weight: 800; color: #111827;">فاتورة ضريبية رسمية</div>
          <div style="font-size: 14px; font-weight: 600; color: #4b5563;">TAX INVOICE</div>
          <div style="margin-top: 6px; font-size: 12px;"><strong>Inv #:</strong> ${invoice.orderNumber}</div>
          <div style="font-size: 12px;"><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-GB')}</div>
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: space-between; background: #f9fafb; padding: 12px; border-radius: 8px;">
        <div>
          <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">بيانات العميل / Customer:</div>
          <div>${invoice.customer.name}</div>
          <div>${invoice.customer.phone || 'N/A'}</div>
          ${invoice.customer.taxNumber ? `<div>Tax ID: ${invoice.customer.taxNumber}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">بيانات المنشأة / Store Tax Info:</div>
          <div>رقم البطاقة الضريبية: <strong>${settings.taxId || 'N/A'}</strong></div>
          <div>رقم السجل التجاري: <strong>${settings.commercialReg || 'N/A'}</strong></div>
          <div>الكاشير: <strong>${invoice.cashierName}</strong></div>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <table>
          <thead>
            <tr style="background: #111827; color: #fff; font-size: 12px;">
              <th style="padding: 10px; text-align: center; width: 40px;">#</th>
              <th style="padding: 10px; text-align: left;">البيان / Item Description</th>
              <th style="padding: 10px; text-align: center; width: 90px;">النوع</th>
              <th style="padding: 10px; text-align: center; width: 60px;">الكمية</th>
              <th style="padding: 10px; text-align: right; width: 100px;">السعر (${settings.currency})</th>
              <th style="padding: 10px; text-align: right; width: 120px;">الإجمالي (${settings.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <table style="width: 320px; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0;">المجموع الفرعي (Subtotal):</td>
            <td style="padding: 6px 0; text-align: right;">${invoice.subtotal.toFixed(2)} ${settings.currency}</td>
          </tr>
          ${invoice.discountTotal > 0 ? `
            <tr style="color: #dc2626;">
              <td style="padding: 6px 0;">الخصم (Discount):</td>
              <td style="padding: 6px 0; text-align: right;">-${invoice.discountTotal.toFixed(2)} ${settings.currency}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0;">ضريبة القيمة المضافة (${invoice.taxRate}%):</td>
            <td style="padding: 6px 0; text-align: right;">${invoice.taxTotal.toFixed(2)} ${settings.currency}</td>
          </tr>
          <tr style="font-size: 16px; font-weight: 800; border-top: 2px solid #111827;">
            <td style="padding: 10px 0;">الإجمالي الكلي (Total):</td>
            <td style="padding: 10px 0; text-align: right; color: #dc2626;">${invoice.total.toFixed(2)} ${settings.currency}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #6b7280;">
        <div><strong>الشروط والضمان:</strong> ${settings.returnPolicyText}</div>
        <div style="margin-top: 4px; text-align: center; font-weight: bold; color: #111827;">${settings.customFooterNote || 'GamesUP - Your Ultimate Gaming Hub'}</div>
      </div>
    </body>
    </html>
  `.trim();
}

/**
 * Executes direct printing via Electron IPC or browser fallback
 */
export async function printInvoice(
  invoice: Invoice,
  settings: StoreSettings,
  type: 'thermal' | 'a4' = 'thermal'
): Promise<boolean> {
  const isDesktop = typeof window !== 'undefined' && window.posHardware?.isDesktop;

  if (type === 'thermal') {
    // 1. Direct ESC/POS Raster Printing (Nexfood architecture)
    // Produces 100% sharp Arabic text, Code-128 barcodes, borders, and clean hardware cuts on any thermal printer
    if (isDesktop && window.posHardware?.printRaw) {
      try {
        const rawBytes = generateRasterReceiptEscPos(invoice, settings);
        const base64Data = uint8ArrayToBase64(rawBytes);
        const res = await window.posHardware.printRaw({
          printerName: settings.thermalPrinterName,
          base64Data
        });
        if (res.success) {
          return true;
        }
        console.warn('printRaw returned error, falling back to printReceipt:', res.errorType);
      } catch (err) {
        console.warn('Error during raster print, falling back to printReceipt:', err);
      }
    }

    // 2. Fallback: Electron HTML GDI printing or browser iframe
    const html = buildThermalReceiptHtml(invoice, settings);
    if (isDesktop && window.posHardware?.printReceipt) {
      const res = await window.posHardware.printReceipt({
        printerName: settings.thermalPrinterName,
        silent: settings.silentPrint ?? true,
        htmlContent: html,
        paperWidth: settings.paperWidth,
        autoCut: settings.autoCutPaper ?? true
      });
      if (invoice.payment.method === 'CASH' && settings.kickDrawerOnCash && window.posHardware?.openCashDrawer) {
        await window.posHardware.openCashDrawer({ printerName: settings.thermalPrinterName });
      }
      return res.success;
    } else {
      printViaIframe(html);
      return true;
    }
  } else {
    const html = buildA4InvoiceHtml(invoice, settings);
    if (isDesktop && window.posHardware?.printA4Invoice) {
      const res = await window.posHardware.printA4Invoice({
        printerName: settings.a4PrinterName,
        silent: false,
        htmlContent: html
      });
      return res.success;
    } else {
      printViaIframe(html);
      return true;
    }
  }
}

/**
 * Executes Diagnostic Test Receipt Print on connected Thermal Printer
 */
export async function printTestReceipt(settings: StoreSettings): Promise<{ success: boolean; error?: string }> {
  const isDesktop = typeof window !== 'undefined' && window.posHardware?.isDesktop;

  // 1. Direct ESC/POS Raster Printing (Nexfood architecture)
  if (isDesktop && window.posHardware?.printRaw) {
    try {
      const rawBytes = generateTestReceiptRasterEscPos(settings);
      const base64Data = uint8ArrayToBase64(rawBytes);
      const res = await window.posHardware.printRaw({
        printerName: settings.thermalPrinterName,
        base64Data
      });
      if (res.success) {
        return { success: true };
      }
      console.warn('printRaw returned error in test receipt, falling back:', res.errorType);
    } catch (err: any) {
      console.warn('Error in test raster print, falling back:', err);
    }
  }

  // 2. Fallback: Electron HTML GDI printing or browser iframe
  const html = buildTestReceiptHtml(settings);
  if (isDesktop && window.posHardware?.printReceipt) {
    try {
      const res = await window.posHardware.printReceipt({
        printerName: settings.thermalPrinterName,
        silent: settings.silentPrint ?? true,
        htmlContent: html,
        paperWidth: settings.paperWidth,
        autoCut: settings.autoCutPaper ?? true
      });

      if (settings.kickDrawerOnCash && window.posHardware?.openCashDrawer) {
        await window.posHardware.openCashDrawer({ printerName: settings.thermalPrinterName });
      }

      return { success: res.success, error: res.errorType };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  } else {
    printViaIframe(html);
    return { success: true };
  }
}


function printViaIframe(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
}
