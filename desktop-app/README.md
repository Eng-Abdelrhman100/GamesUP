# GamesUP Gaming Store Desktop POS & Invoicing System

A dedicated, high-performance desktop Point of Sale (POS) application built specifically for gaming retail stores, featuring raw ESC/POS thermal printing, standard A4 tax invoice generation, dynamic Egypt 14% VAT management, automated SKU/barcode creation, and cashier shift control.

---

## 🚀 Key Features

### 1. High-Speed Gaming Store POS Terminal
- **Fast Barcode Scanner Listener**: Global background HID listener detects rapid scanner input automatically without requiring text field focus.
- **Physical & Digital Inventory Support**:
  - Consoles, physical discs, accessories, and controllers.
  - Digital PlayStation/Xbox/Steam accounts with slot selection (Primary PS4, Primary PS5, Secondary, Full Account).
  - Serial number (S/N) and IMEI tracking for hardware warranty records.
- **Payment Tenders**: Cash with auto change calculator, POS Card, InstaPay, Vodafone Cash, and Split tender payments.

### 2. Dual Printing Engine
- **80mm / 58mm Thermal Receipt**:
  - Direct silent printing via ESC/POS driver.
  - Store header, cashier name, customer info, itemized slot breakdown, subtotal, discount, VAT breakdown, and Code-128 return barcode.
  - Automatic paper cut and RJ11 cash drawer kick pulse (`ESC p 0 25 250`).
- **Official A4 Tax Invoice (فاتورة ضريبية رسمية)**:
  - Compliant with Egyptian Tax Authority standards (Commercial Registration & Tax Card).
  - Itemized table with taxable base, VAT rate, and net total.
  - Direct print or exportable to PDF.

### 3. Dynamic Tax & VAT Management
- **Instant Tax Toggle**: Cashiers can turn VAT (14%) ON or OFF with a single switch at checkout.
- **Tax Inclusion Modes**:
  - **Tax Inclusive (شامل الضريبة)**: Displayed prices already include VAT; receipt calculates and discloses the tax breakdown.
  - **Tax Exclusive (غير شامل الضريبة)**: Prices are net; +14% VAT is calculated and added on checkout.
- **Per-Item Exemption**: Mark specific items (such as wallet top-up cards) as tax-exempt while keeping hardware taxable.

### 4. SKU & Barcode Generation Engine
- **Automated SKU Convention**:
  - Format: `GUP-[PLATFORM]-[CATEGORY]-[ABBR]-[SLOT]-[SEQUENCE]`
  - Examples: `GUP-PS5-HW-SLIM-101`, `GUP-PS5-DISC-FC25-01`, `GUP-PS4-DIG-PRI-042`.
- **Code-128 & EAN-13 Barcodes**: High-density SVG barcode rendering.
- **Sticker Label Studio**: Thermal label designer for adhesive shelf tags (40x30mm, 50x25mm, 38x25mm) with store branding, title, SKU, price, and barcode.

### 5. Cash Drawer & Shift Management
- **Opening Float**: Record start-of-day drawer cash.
- **Petty Cash Drops**: Record mid-shift expenses or cash withdrawals.
- **Z-Report Shift Close**: Count physical cash, calculate discrepancy (overage/shortage), and generate end-of-day reconciliation reports.

---

## 🛠️ Technology Stack

- **Desktop Framework**: Electron 34
- **Frontend Core**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Icons**: Lucide React
- **Architecture**: Modular, offline-resilient with local storage caching and auto-sync queue.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
cd desktop-app
npm install
```

### 2. Development Mode
- **Web Browser Preview**:
  ```bash
  npm run dev
  ```
- **Electron Desktop Window**:
  ```bash
  npm run electron:dev
  ```

### 3. Build Production Windows Executable (.exe)
```bash
npm run electron:build
```
The installer and portable `.exe` will be generated in `desktop-app/dist/`.

---

## 🔌 Hardware Setup Guide

1. **80mm Thermal Receipt Printer**:
   - Connect via USB or Ethernet.
   - Install the printer Windows driver (e.g., Xprinter, Epson TM-T20, Bixolon, Sunmi).
   - In the POS settings, enter the printer name (or leave empty to use Windows default).
2. **Cash Drawer**:
   - Plug the RJ11 cable from the cash drawer into the back of the thermal printer.
   - The desktop app will automatically send the drawer kick pulse upon completing cash sales.
3. **USB Barcode Scanner**:
   - Any standard plug-and-play USB HID barcode scanner (Honeywell, Zebra, Datalogic, Netum) works out of the box. Ensure the scanner is set to append an `Enter` suffix after scans (factory default).
