import XLSX from 'xlsx';

const inputFile = './Games up Accounts final PRIV (1).xlsx';
const outputFile = './Games up Accounts final PRIV (1)_database_ready.xlsx';

console.log('Loading workbook:', inputFile);
const workbook = XLSX.readFile(inputFile);

const cleanWorkbook = XLSX.utils.book_new();

// Helper to convert Excel serial date to YYYY-MM-DD
function parseExcelDate(serial) {
  if (typeof serial === 'string') {
    // If it's already a date-like string, clean it
    const cleanStr = serial.trim();
    if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) || cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return cleanStr;
    }
    return serial;
  }
  if (typeof serial === 'number' && serial > 0) {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    
    const year = dateInfo.getFullYear();
    const month = String(dateInfo.getMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return serial;
}

// Clean and normalize value
function cleanValue(val) {
  if (val === null || val === undefined) return '';
  const strVal = String(val).trim();
  if (strVal === '#VALUE!' || strVal === '#REF!' || strVal === '?' || strVal === '-') {
    return '';
  }
  return val;
}

workbook.SheetNames.forEach(sheetName => {
  console.log(`Processing sheet: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length === 0) return;

  // Find header row candidate
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const nonNullCount = rows[i].filter(val => val !== null && val !== undefined && val !== '').length;
    if (nonNullCount > rows[headerIndex].filter(val => val !== null && val !== undefined && val !== '').length) {
      headerIndex = i;
    }
  }

  const rawHeaders = rows[headerIndex] || [];
  const dataRows = rows.slice(headerIndex + 1);

  // Define clean standard headers mapped from common sheet columns
  const standardHeaders = [
    'Email', 'Password', 'PrimaryPS4Code', 'PrimaryPS5Code', 'SecondaryCode',
    'PrimaryPS4OFFCode', 'PrimaryPS5OFFCode', 'Type', 'BirthDate', 'OutlookPassword',
    'TwoFactorCode', 'Region', 'Cost', 'Profit', 'AccountFullData'
  ];

  // Map raw headers to standard indices
  const headerMapping = rawHeaders.map((header) => {
    if (!header) return null;
    const h = String(header).toLowerCase().trim();
    if (h.includes('email') || h === 'account' || h === 'account (1 year)' || h === 'account ( 3 months)') return 'Email';
    if (h === 'password' || h === 'pass') return 'Password';
    if (h.includes('primary ps4') && !h.includes('off')) return 'PrimaryPS4Code';
    if (h.includes('primary ps5') && !h.includes('off')) return 'PrimaryPS5Code';
    if (h === 'secondary') return 'SecondaryCode';
    if (h.includes('ps4 (off)') || h === 'ps4 offline') return 'PrimaryPS4OFFCode';
    if (h.includes('ps5 (off)') || h === 'ps5 offline') return 'PrimaryPS5OFFCode';
    if (h === 'type' || h === 'type of game' || h === 'type of account') return 'Type';
    if (h.includes('birth date') || h.includes('birthdate')) return 'BirthDate';
    if (h.includes('outlook pass') || h.includes('gmail/outlook pass') || h === 'mail pass') return 'OutlookPassword';
    if (h.includes('2fa') || h.includes('two factor') || h.includes('two-factor')) return 'TwoFactorCode';
    if (h === 'reigon' || h === 'region') return 'Region';
    if (h === 'cost' || h === 'cost of account') return 'Cost';
    if (h === 'profit') return 'Profit';
    if (h.includes('full data') || h.includes('full account')) return 'AccountFullData';
    return null;
  });

  // Re-build rows with standard headers
  const cleanedRows = dataRows.map(row => {
    const cleanRow = {};
    standardHeaders.forEach(h => {
      cleanRow[h] = '';
    });

    row.forEach((val, idx) => {
      const mappedHeader = headerMapping[idx];
      if (mappedHeader) {
        let cleanedVal = cleanValue(val);
        if (mappedHeader === 'BirthDate') {
          cleanedVal = parseExcelDate(cleanedVal);
        }
        cleanRow[mappedHeader] = cleanedVal;
      }
    });

    return cleanRow;
  }).filter(row => row.Email || row.Password || row.PrimaryPS4Code || row.PrimaryPS5Code || row.SecondaryCode);

  if (cleanedRows.length > 0) {
    const cleanSheet = XLSX.utils.json_to_sheet(cleanedRows, { header: standardHeaders });
    XLSX.utils.book_append_sheet(cleanWorkbook, cleanSheet, sheetName);
  }
});

console.log('Writing clean workbook to:', outputFile);
XLSX.writeFile(cleanWorkbook, outputFile);
console.log('Finished successfully!');
