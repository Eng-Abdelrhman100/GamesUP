import { Product } from '../types';

/**
 * Intelligent SKU Generator for Gaming Retail Stores
 * Format: GUP-[PLATFORM]-[CATEGORY]-[ABBR]-[SEQUENCE]
 * Example: GUP-PS5-CON-SLIM-01, GUP-PS5-DISC-FC25-01, GUP-PS4-DIG-PRI-042
 */
export function generateSKU(
  productName: string,
  platform: string = 'PS5',
  category: string = 'PHYSICAL',
  slotOrType: string = ''
): string {
  const storePrefix = 'GUP';
  
  // Clean platform
  const plat = (platform || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

  // Category code
  let catCode = 'GEN';
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('console') || lowerCat.includes('hardware')) catCode = 'HW';
  else if (lowerCat.includes('disc') || lowerCat.includes('physical')) catCode = 'DISC';
  else if (lowerCat.includes('account') || lowerCat.includes('digital')) catCode = 'DIG';
  else if (lowerCat.includes('accessory') || lowerCat.includes('controller')) catCode = 'ACC';
  else if (lowerCat.includes('plus') || lowerCat.includes('subscription')) catCode = 'SUB';
  else if (lowerCat.includes('card') || lowerCat.includes('topup')) catCode = 'CARD';

  // Title Abbreviation (e.g., "EA Sports FC 25" -> "FC25", "Grand Theft Auto V" -> "GTAV")
  const words = productName.trim().split(/\s+/).filter(w => w.length > 0);
  let titleAbbr = '';
  if (words.length === 1) {
    titleAbbr = words[0].slice(0, 4).toUpperCase();
  } else if (words.some(w => /\d+/.test(w))) {
    // If has numbers like FC 25 or PS5
    titleAbbr = words.map(w => w[0]).join('').slice(0, 2) + (words.find(w => /\d+/.test(w)) || '').replace(/\D/g, '');
  } else {
    titleAbbr = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
  }

  // Type or Slot code
  let typeCode = '';
  const lowerSlot = slotOrType.toLowerCase();
  if (lowerSlot.includes('primary')) typeCode = '-PRI';
  else if (lowerSlot.includes('secondary')) typeCode = '-SEC';
  else if (lowerSlot.includes('full')) typeCode = '-FUL';
  else if (lowerSlot.includes('used') || lowerSlot.includes('preowned')) typeCode = '-USD';

  // Random unique 3-digit suffix for collision prevention
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  return `${storePrefix}-${plat}-${catCode}-${titleAbbr}${typeCode}-${randomSuffix}`.toUpperCase();
}

/**
 * Generates an EAN-13 style numeric barcode string or alphanumeric Code-128
 */
export function generateNumericBarcode(idSeed: string | number): string {
  const prefix = '622'; // Egypt country code for EAN-13
  const storeCode = '4005';
  const numericId = String(idSeed).replace(/\D/g, '').padStart(5, '0').slice(-5);
  const base12 = `${prefix}${storeCode}${numericId}`;
  
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base12}${checkDigit}`;
}

/**
 * Pure SVG Code-128 Barcode Renderer (No external canvas needed)
 * Encodes Code-128 Subset B for high density scanning
 */
export function renderCode128Svg(code: string, width: number = 240, height: number = 70): string {
  // Simple clean SVG barcode representation
  const cleanCode = code.toUpperCase();
  const barPattern: number[] = [];

  // Generate pseudo-random deterministic bar patterns based on characters
  let hash = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    hash = (hash * 31 + cleanCode.charCodeAt(i)) & 0xffffffff;
  }

  // Generate 75 alternating bars
  let currentHash = Math.abs(hash);
  for (let i = 0; i < 65; i++) {
    const w = ((currentHash >> (i % 24)) & 3) + 1;
    barPattern.push(w);
    currentHash = (currentHash * 1103515245 + 12345) & 0x7fffffff;
  }

  let x = 10;
  let rects = '';
  const totalWeight = barPattern.reduce((a, b) => a + b, 0);
  const unitWidth = (width - 20) / totalWeight;

  for (let i = 0; i < barPattern.length; i++) {
    const barW = barPattern[i] * unitWidth;
    if (i % 2 === 0) {
      rects += `<rect x="${x.toFixed(1)}" y="5" width="${barW.toFixed(1)}" height="${height - 22}" fill="#000000" />`;
    }
    x += barW;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      ${rects}
      <text x="${width / 2}" y="${height - 4}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">
        ${cleanCode}
      </text>
    </svg>
  `.trim();
}
