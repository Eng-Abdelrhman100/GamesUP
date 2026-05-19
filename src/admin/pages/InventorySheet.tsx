import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { productsAPI } from '@/utils/api';
import { 
  Search, Plus, Trash2, Save, RotateCcw, Download, Upload, 
  ChevronDown, Check, AlertCircle, RefreshCw
} from 'lucide-react';

interface GridRow {
  _productId: string | number;
  _itemId: string;
  _isNew?: boolean;
  _isDeleted?: boolean;
  _isModified?: boolean;
  
  productName: string;
  email: string;
  password?: string;
  outlookEmail?: string;
  outlookPassword?: string;
  region?: string;
  onlineId?: string;
  backupCodes?: string;
  
  primaryPs4Code?: string;
  primaryPs4Sold?: boolean;
  primaryPs5Code?: string;
  primaryPs5Sold?: boolean;
  secondaryCode?: string;
  secondarySold?: boolean;
  offlinePs4Code?: string;
  offlinePs4Sold?: boolean;
  offlinePs5Code?: string;
  offlinePs5Sold?: boolean;
}

export function InventorySheet() {
  const [products, setProducts] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<GridRow[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');

  // Selection states
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Bulk action states
  const [bulkReassignProductId, setBulkReassignProductId] = useState<string>('');
  const [bulkRegion, setBulkRegion] = useState('');

  // Importer states
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddProductId, setBulkAddProductId] = useState('');
  const [bulkAddRawText, setBulkAddRawText] = useState('');
  const [bulkAddFormat, setBulkAddFormat] = useState<'email:pass' | 'email:pass:outlook:outlookpass' | 'codes_only'>('email:pass');
  const [bulkAddSlot, setBulkAddSlot] = useState<'Primary ps4' | 'Primary ps5' | 'Secondary' | 'Offline ps4' | 'Offline ps5'>('Primary ps4');

  // Load products and flatten digitalItems
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productsAPI.getAll();
      const productList = res.products || res || [];
      setProducts(productList);

      const gridRows: GridRow[] = [];
      for (const prod of productList) {
        const rawDigitalItems = prod.digitalItems || prod.digital_items;
        const digitalItems = typeof rawDigitalItems === 'string' 
          ? JSON.parse(rawDigitalItems) 
          : (rawDigitalItems || []);
          
        if (Array.isArray(digitalItems)) {
          for (const item of digitalItems) {
            gridRows.push({
              _productId: String(prod.id),
              _itemId: item.id || crypto.randomUUID(),
              productName: prod.name,
              email: item.email || '',
              password: item.password || '',
              outlookEmail: item.outlookEmail || '',
              outlookPassword: item.outlookPassword || '',
              region: item.region || '',
              onlineId: item.onlineId || '',
              backupCodes: item.backupCodes || '',
              
              primaryPs4Code: item.slots?.['Primary ps4']?.code || '',
              primaryPs4Sold: !!item.slots?.['Primary ps4']?.sold,
              primaryPs5Code: item.slots?.['Primary ps5']?.code || '',
              primaryPs5Sold: !!item.slots?.['Primary ps5']?.sold,
              secondaryCode: item.slots?.['Secondary']?.code || '',
              secondarySold: !!item.slots?.['Secondary']?.sold,
              offlinePs4Code: item.slots?.['Offline ps4']?.code || '',
              offlinePs4Sold: !!item.slots?.['Offline ps4']?.sold,
              offlinePs5Code: item.slots?.['Offline ps5']?.code || '',
              offlinePs5Sold: !!item.slots?.['Offline ps5']?.sold,
            });
          }
        }
      }

      setOriginalRows(JSON.parse(JSON.stringify(gridRows)));
      setRows(gridRows);
      setSelectedItemIds(new Set());
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if there are unsaved changes
  const unsavedChangesCount = useMemo(() => {
    let count = 0;
    // Modified rows (excluding deleted new rows)
    const modifiedCount = rows.filter(r => r._isModified && !r._isNew && !r._isDeleted).length;
    // New active rows
    const newCount = rows.filter(r => r._isNew && !r._isDeleted).length;
    // Deleted existing rows
    const deletedCount = rows.filter(r => r._isDeleted && !r._isNew).length;
    
    return modifiedCount + newCount + deletedCount;
  }, [rows]);

  // Reset all local changes
  const handleReset = () => {
    if (confirm('Discard all unsaved changes and reload data?')) {
      setRows(JSON.parse(JSON.stringify(originalRows)));
      setSelectedItemIds(new Set());
    }
  };

  // Modify individual cell value
  const handleCellChange = (itemId: string, field: keyof GridRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row._itemId === itemId) {
        const updated = { ...row, [field]: value, _isModified: true };
        
        // If row is modified, check if it became identical to original to clean modified status
        const original = originalRows.find(or => or._itemId === itemId);
        if (original) {
          let hasDiff = false;
          for (const key of Object.keys(row) as Array<keyof GridRow>) {
            if (key.startsWith('_')) continue;
            if (key === 'productName') continue;
            if (updated[key] !== original[key]) {
              hasDiff = true;
              break;
            }
          }
          updated._isModified = hasDiff;
        }
        return updated;
      }
      return row;
    }));
  };

  // Add a blank row
  const handleAddRow = () => {
    const defaultProduct = products[0];
    if (!defaultProduct) {
      alert('No products available to assign');
      return;
    }

    const newRow: GridRow = {
      _productId: String(defaultProduct.id),
      _itemId: crypto.randomUUID(),
      _isNew: true,
      productName: defaultProduct.name,
      email: '',
      password: '',
      outlookEmail: '',
      outlookPassword: '',
      region: '',
      onlineId: '',
      backupCodes: '',
      primaryPs4Code: '',
      primaryPs4Sold: false,
      primaryPs5Code: '',
      primaryPs5Sold: false,
      secondaryCode: '',
      secondarySold: false,
      offlinePs4Code: '',
      offlinePs4Sold: false,
      offlinePs5Code: '',
      offlinePs5Sold: false
    };

    setRows(prev => [newRow, ...prev]);
  };

  // Delete selected rows (soft delete locally)
  const handleDeleteSelected = () => {
    if (selectedItemIds.size === 0) return;
    if (!confirm(`Delete ${selectedItemIds.size} selected rows?`)) return;

    setRows(prev => prev.map(row => {
      if (selectedItemIds.has(row._itemId)) {
        return { ...row, _isDeleted: true };
      }
      return row;
    }));
    setSelectedItemIds(new Set());
  };

  // Bulk Reassign selected rows to another product
  const handleBulkReassign = () => {
    if (selectedItemIds.size === 0 || !bulkReassignProductId) return;
    const targetProduct = products.find(p => String(p.id) === String(bulkReassignProductId));
    if (!targetProduct) return;

    setRows(prev => prev.map(row => {
      if (selectedItemIds.has(row._itemId)) {
        return { 
          ...row, 
          _productId: String(targetProduct.id), 
          productName: targetProduct.name,
          _isModified: true 
        };
      }
      return row;
    }));

    setSelectedItemIds(new Set());
    setBulkReassignProductId('');
    alert(`Reassigned selected items to "${targetProduct.name}"`);
  };

  // Bulk set region
  const handleBulkSetRegion = () => {
    if (selectedItemIds.size === 0 || !bulkRegion.trim()) return;

    setRows(prev => prev.map(row => {
      if (selectedItemIds.has(row._itemId)) {
        return { ...row, region: bulkRegion.trim(), _isModified: true };
      }
      return row;
    }));

    setSelectedItemIds(new Set());
    setBulkRegion('');
  };

  // Bulk mark sold/unsold
  const handleBulkMarkSoldStatus = (sold: boolean) => {
    if (selectedItemIds.size === 0) return;

    setRows(prev => prev.map(row => {
      if (selectedItemIds.has(row._itemId)) {
        return { 
          ...row, 
          primaryPs4Sold: row.primaryPs4Code ? sold : row.primaryPs4Sold,
          primaryPs5Sold: row.primaryPs5Code ? sold : row.primaryPs5Sold,
          secondarySold: row.secondaryCode ? sold : row.secondarySold,
          offlinePs4Sold: row.offlinePs4Code ? sold : row.offlinePs4Sold,
          offlinePs5Sold: row.offlinePs5Code ? sold : row.offlinePs5Sold,
          _isModified: true 
        };
      }
      return row;
    }));

    setSelectedItemIds(new Set());
  };

  // Selection handlers
  const handleToggleSelectRow = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (unsavedChangesCount === 0) return;
    
    try {
      setSaving(true);
      setError(null);

      // 1. Group active rows by product ID
      const activeRowsByProduct: Record<string, GridRow[]> = {};
      
      // Initialize with all products to handle empty tables (where all items were deleted)
      for (const prod of products) {
        activeRowsByProduct[String(prod.id)] = [];
      }

      // Filter and distribute active rows
      rows.forEach(row => {
        if (!row._isDeleted) {
          const pid = String(row._productId);
          if (!activeRowsByProduct[pid]) {
            activeRowsByProduct[pid] = [];
          }
          activeRowsByProduct[pid].push(row);
        }
      });

      // 2. Identify products that have changes
      const affectedProductIds = new Set<string>();
      
      // Look at new/modified/deleted rows to find affected products
      rows.forEach(row => {
        if (row._isNew || row._isModified || row._isDeleted) {
          affectedProductIds.add(String(row._productId));
        }
      });

      // Also add original products for rows that were reassigned or deleted
      originalRows.forEach(row => {
        const isStillHere = rows.some(r => r._itemId === row._itemId && !r._isDeleted && String(r._productId) === String(row._productId));
        if (!isStillHere) {
          affectedProductIds.add(String(row._productId));
        }
      });

      // 3. For each affected product, serialize digitalItems, calculate new stock, and call PUT API
      for (const pid of Array.from(affectedProductIds)) {
        const productRows = activeRowsByProduct[pid] || [];
        const originalProduct = products.find(p => String(p.id) === pid);
        if (!originalProduct) continue;

        // Map GridRow back to DB digitalItems format
        const digitalItems = productRows.map(row => {
          const slots: Record<string, any> = {};
          
          if (row.primaryPs4Code) slots['Primary ps4'] = { sold: !!row.primaryPs4Sold, orderId: null, code: row.primaryPs4Code };
          if (row.primaryPs5Code) slots['Primary ps5'] = { sold: !!row.primaryPs5Sold, orderId: null, code: row.primaryPs5Code };
          if (row.secondaryCode) slots['Secondary'] = { sold: !!row.secondarySold, orderId: null, code: row.secondaryCode };
          if (row.offlinePs4Code) slots['Offline ps4'] = { sold: !!row.offlinePs4Sold, orderId: null, code: row.offlinePs4Code };
          if (row.offlinePs5Code) slots['Offline ps5'] = { sold: !!row.offlinePs5Sold, orderId: null, code: row.offlinePs5Code };

          return {
            id: row._itemId,
            email: row.email || '',
            password: row.password || '',
            outlookEmail: row.outlookEmail || '',
            outlookPassword: row.outlookPassword || '',
            region: row.region || '',
            onlineId: row.onlineId || '',
            backupCodes: row.backupCodes || '',
            slots,
            totalCodes: Object.keys(slots).length,
            assignedGroup: 'All Groups'
          };
        });

        // Calculate product stock (sum of all slots that are NOT sold)
        let stockCount = 0;
        digitalItems.forEach(item => {
          Object.values(item.slots || {}).forEach((slot: any) => {
            if (slot && !slot.sold) {
              stockCount++;
            }
          });
        });

        const status = stockCount > 0 ? 'In Stock' : 'Out of Stock';

        // Update database for this product
        await productsAPI.update(pid, {
          digitalItems,
          stock: stockCount,
          status
        });
      }

      alert('All inventory changes saved successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      setError(err.message || 'Failed to save inventory updates.');
    } finally {
      setSaving(false);
    }
  };

  // Bulk add text parser
  const handleBulkAddSubmit = () => {
    if (!bulkAddProductId || !bulkAddRawText.trim()) {
      alert('Please select a product and enter accounts data');
      return;
    }

    const selectedProd = products.find(p => String(p.id) === String(bulkAddProductId));
    if (!selectedProd) return;

    const lines = bulkAddRawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newItems: GridRow[] = [];

    lines.forEach(line => {
      let email = '';
      let password = '';
      let outlookEmail = '';
      let outlookPassword = '';
      let primaryPs4Code = '';
      let primaryPs5Code = '';
      let secondaryCode = '';
      let offlinePs4Code = '';
      let offlinePs5Code = '';

      if (bulkAddFormat === 'email:pass') {
        const parts = line.split(':');
        email = parts[0] || '';
        password = parts[1] || '';
      } else if (bulkAddFormat === 'email:pass:outlook:outlookpass') {
        const parts = line.split(':');
        email = parts[0] || '';
        password = parts[1] || '';
        outlookEmail = parts[2] || '';
        outlookPassword = parts[3] || '';
      } else {
        // Codes only
        if (bulkAddSlot === 'Primary ps4') primaryPs4Code = line;
        else if (bulkAddSlot === 'Primary ps5') primaryPs5Code = line;
        else if (bulkAddSlot === 'Secondary') secondaryCode = line;
        else if (bulkAddSlot === 'Offline ps4') offlinePs4Code = line;
        else if (bulkAddSlot === 'Offline ps5') offlinePs5Code = line;
      }

      newItems.push({
        _productId: String(selectedProd.id),
        _itemId: crypto.randomUUID(),
        _isNew: true,
        productName: selectedProd.name,
        email,
        password,
        outlookEmail,
        outlookPassword,
        region: '',
        onlineId: '',
        backupCodes: '',
        primaryPs4Code,
        primaryPs4Sold: false,
        primaryPs5Code,
        primaryPs5Sold: false,
        secondaryCode,
        secondarySold: false,
        offlinePs4Code,
        offlinePs4Sold: false,
        offlinePs5Code,
        offlinePs5Sold: false
      });
    });

    setRows(prev => [...newItems, ...prev]);
    setIsBulkAddModalOpen(false);
    setBulkAddRawText('');
    alert(`Successfully imported ${newItems.length} accounts as unsaved rows!`);
  };

  // CSV Import
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          alert('CSV file is empty or missing headers');
          return;
        }

        // Parse headers to match columns
        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        const newImportedRows: GridRow[] = [];

        // Find default product in case CSV matches
        const defaultProduct = products[0];

        for (let i = 1; i < lines.length; i++) {
          const rowData = lines[i].split(',').map(val => val.replace(/^["']|["']$/g, '').trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = rowData[idx] || '';
          });

          // Match product Name to product ID
          let matchedProd = products.find(p => p.name.toLowerCase() === (obj['ProductName'] || '').toLowerCase());
          if (!matchedProd) {
            matchedProd = defaultProduct;
          }
          if (!matchedProd) continue;

          newImportedRows.push({
            _productId: String(matchedProd.id),
            _itemId: crypto.randomUUID(),
            _isNew: true,
            productName: matchedProd.name,
            email: obj['Email'] || '',
            password: obj['Password'] || '',
            outlookEmail: obj['OutlookEmail'] || '',
            outlookPassword: obj['OutlookPassword'] || '',
            region: obj['Region'] || '',
            onlineId: obj['OnlineID'] || '',
            backupCodes: obj['BackupCodes'] || '',
            primaryPs4Code: obj['PrimaryPS4Code'] || '',
            primaryPs4Sold: obj['PrimaryPS4Sold'] === 'true',
            primaryPs5Code: obj['PrimaryPS5Code'] || '',
            primaryPs5Sold: obj['PrimaryPS5Sold'] === 'true',
            secondaryCode: obj['SecondaryCode'] || '',
            secondarySold: obj['SecondarySold'] === 'true',
            offlinePs4Code: obj['OfflinePS4Code'] || '',
            offlinePs4Sold: obj['OfflinePS4Sold'] === 'true',
            offlinePs5Code: obj['OfflinePS5Code'] || '',
            offlinePs5Sold: obj['OfflinePS5Sold'] === 'true',
          });
        }

        setRows(prev => [...newImportedRows, ...prev]);
        alert(`Successfully imported ${newImportedRows.length} rows from CSV!`);
      } catch (err: any) {
        alert('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // CSV Export
  const handleCsvExport = () => {
    if (filteredRows.length === 0) {
      alert('No rows available to export');
      return;
    }

    const headers = [
      'ProductName', 'Email', 'Password', 'OutlookEmail', 'OutlookPassword',
      'Region', 'OnlineID', 'BackupCodes', 
      'PrimaryPS4Code', 'PrimaryPS4Sold',
      'PrimaryPS5Code', 'PrimaryPS5Sold',
      'SecondaryCode', 'SecondarySold',
      'OfflinePS4Code', 'OfflinePS4Sold',
      'OfflinePS5Code', 'OfflinePS5Sold'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredRows.map(row => [
        `"${row.productName.replace(/"/g, '""')}"`,
        `"${(row.email || '').replace(/"/g, '""')}"`,
        `"${(row.password || '').replace(/"/g, '""')}"`,
        `"${(row.outlookEmail || '').replace(/"/g, '""')}"`,
        `"${(row.outlookPassword || '').replace(/"/g, '""')}"`,
        `"${(row.region || '').replace(/"/g, '""')}"`,
        `"${(row.onlineId || '').replace(/"/g, '""')}"`,
        `"${(row.backupCodes || '').replace(/"/g, '""')}"`,
        `"${(row.primaryPs4Code || '').replace(/"/g, '""')}"`,
        row.primaryPs4Sold ? 'true' : 'false',
        `"${(row.primaryPs5Code || '').replace(/"/g, '""')}"`,
        row.primaryPs5Sold ? 'true' : 'false',
        `"${(row.secondaryCode || '').replace(/"/g, '""')}"`,
        row.secondarySold ? 'true' : 'false',
        `"${(row.offlinePs4Code || '').replace(/"/g, '""')}"`,
        row.offlinePs4Sold ? 'true' : 'false',
        `"${(row.offlinePs5Code || '').replace(/"/g, '""')}"`,
        row.offlinePs5Sold ? 'true' : 'false'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'gamesup_inventory.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows for rendering
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Don't show soft deleted rows
      if (row._isDeleted) return false;

      // Filter by product
      if (selectedProductFilter !== 'all' && String(row._productId) !== selectedProductFilter) {
        return false;
      }

      // Filter by sold/available status
      if (statusFilter !== 'all') {
        const isSold = [
          row.primaryPs4Sold, row.primaryPs5Sold, row.secondarySold, 
          row.offlinePs4Sold, row.offlinePs5Sold
        ].some(Boolean);
        
        if (statusFilter === 'sold' && !isSold) return false;
        if (statusFilter === 'available' && isSold) return false;
      }

      // Filter by search text
      if (searchTerm.trim() !== '') {
        const s = searchTerm.toLowerCase();
        const matches = 
          row.productName.toLowerCase().includes(s) ||
          (row.email || '').toLowerCase().includes(s) ||
          (row.password || '').toLowerCase().includes(s) ||
          (row.outlookEmail || '').toLowerCase().includes(s) ||
          (row.region || '').toLowerCase().includes(s) ||
          (row.onlineId || '').toLowerCase().includes(s) ||
          (row.primaryPs4Code || '').toLowerCase().includes(s) ||
          (row.primaryPs5Code || '').toLowerCase().includes(s) ||
          (row.secondaryCode || '').toLowerCase().includes(s);
        
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, selectedProductFilter, statusFilter, searchTerm]);

  // Master checkbox selection
  const isAllSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.every(row => selectedItemIds.has(row._itemId));
  }, [filteredRows, selectedItemIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredRows.forEach(row => next.delete(row._itemId));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredRows.forEach(row => next.add(row._itemId));
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        <p className="text-gray-500 dark:text-gray-400 font-display">Loading large sheet data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider italic">
            Inventory Spreadsheet
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Excel-style bulk accounts and codes manager for digital game slots. Edit cells directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setIsBulkAddModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-1.5 text-xs py-2 bg-brand-red/10 border border-brand-red/20 text-brand-red hover:bg-brand-red/20"
          >
            <Plus className="w-4 h-4" /> Bulk Add/Paste
          </Button>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer text-xs border border-gray-200 dark:border-gray-700 transition-colors">
            <Upload className="w-4 h-4" /> Import CSV
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCsvImport} 
              className="hidden" 
            />
          </label>
          <Button 
            onClick={handleCsvExport}
            variant="secondary"
            className="flex items-center gap-1.5 text-xs py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button 
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-xs py-2 bg-brand-red text-white"
          >
            <Plus className="w-4 h-4" /> Add Row
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <Card className="p-4 bg-bg-secondary border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search email, codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            />
          </div>

          {/* Product Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available Only</option>
              <option value="sold">Sold Only</option>
            </select>
          </div>
        </div>

        {/* Reload button */}
        <Button 
          onClick={loadData}
          variant="secondary"
          className="flex items-center gap-1.5 text-xs py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </Button>
      </Card>

      {/* Bulk Operations Toolbar (Visible only when rows are selected) */}
      {selectedItemIds.size > 0 && (
        <Card className="p-4 bg-brand-red/5 border border-brand-red/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-red uppercase tracking-wider italic">
              {selectedItemIds.size} rows selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Reassign dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkReassignProductId}
                onChange={(e) => setBulkReassignProductId(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">Move to Product...</option>
                {products.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <Button 
                onClick={handleBulkReassign}
                disabled={!bulkReassignProductId}
                className="px-3 py-1.5 text-xs bg-brand-red text-white"
              >
                Move
              </Button>
            </div>

            {/* Bulk Region */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Set Region..."
                value={bulkRegion}
                onChange={(e) => setBulkRegion(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              />
              <Button 
                onClick={handleBulkSetRegion}
                disabled={!bulkRegion.trim()}
                className="px-3 py-1.5 text-xs bg-brand-red text-white"
              >
                Set
              </Button>
            </div>

            {/* Bulk mark sold / unsold */}
            <div className="flex gap-1.5">
              <Button 
                onClick={() => handleBulkMarkSoldStatus(true)}
                variant="secondary"
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                Mark Sold
              </Button>
              <Button 
                onClick={() => handleBulkMarkSoldStatus(false)}
                variant="secondary"
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                Mark Unsold
              </Button>
            </div>

            {/* Delete button */}
            <Button 
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Spreadsheet Data Grid */}
      <Card className="border-border-subtle bg-bg-secondary overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 select-none border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <tr>
                <th className="w-10 px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-brand-red focus:ring-brand-red"
                  />
                </th>
                <th className="w-64 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Game / Product
                </th>
                <th className="w-52 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Password
                </th>
                <th className="w-52 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Outlook Email
                </th>
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Outlook Pass
                </th>
                <th className="w-24 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Region
                </th>
                <th className="w-32 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Online ID
                </th>
                <th className="w-32 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Backup Codes
                </th>
                
                {/* PS4 Primary */}
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Primary PS4 Key
                </th>
                <th className="w-16 px-1 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Sold
                </th>

                {/* PS5 Primary */}
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Primary PS5 Key
                </th>
                <th className="w-16 px-1 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Sold
                </th>

                {/* Secondary */}
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Secondary Key
                </th>
                <th className="w-16 px-1 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Sold
                </th>

                {/* Offline PS4 */}
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Offline PS4 Key
                </th>
                <th className="w-16 px-1 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Sold
                </th>

                {/* Offline PS5 */}
                <th className="w-40 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Offline PS5 Key
                </th>
                <th className="w-16 px-1 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Sold
                </th>

                <th className="w-16 px-3 py-3 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.map((row) => {
                // Determine background row styling based on modifications
                let rowBg = 'bg-white dark:bg-gray-900';
                if (row._isNew) rowBg = 'bg-green-500/5 dark:bg-green-500/10';
                else if (row._isModified) rowBg = 'bg-orange-500/5 dark:bg-orange-500/10';

                return (
                  <tr key={row._itemId} className={`${rowBg} hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors`}>
                    {/* Checkbox cell */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(row._itemId)}
                        onChange={() => handleToggleSelectRow(row._itemId)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Product cell (Dropdown) */}
                    <td className="px-1.5 py-1 border-r border-gray-200 dark:border-gray-700">
                      <select
                        value={String(row._productId)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const p = products.find(prod => String(prod.id) === val);
                          if (p) {
                            handleCellChange(row._itemId, '_productId', val);
                            handleCellChange(row._itemId, 'productName', p.name);
                          }
                        }}
                        className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red bg-transparent text-xs"
                      >
                        {products.map(p => (
                          <option key={p.id} value={String(p.id)} className="bg-white dark:bg-gray-900 text-black dark:text-white">{p.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Simple text input helper to render cell content */}
                    {[
                      { field: 'email', placeholder: 'Email Address' },
                      { field: 'password', placeholder: 'Sony Password' },
                      { field: 'outlookEmail', placeholder: 'Recovery Email' },
                      { field: 'outlookPassword', placeholder: 'Recovery Password' },
                      { field: 'region', placeholder: 'US, EU, etc.' },
                      { field: 'onlineId', placeholder: 'Online ID' },
                      { field: 'backupCodes', placeholder: '2FA Backup Codes' },
                      { field: 'primaryPs4Code', placeholder: 'PS4 Key' }
                    ].map(col => (
                      <td key={col.field} className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={(row as any)[col.field] || ''}
                          placeholder={col.placeholder}
                          onChange={(e) => handleCellChange(row._itemId, col.field as any, e.target.value)}
                          className="w-full h-8 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                        />
                      </td>
                    ))}

                    {/* Primary PS4 Sold checkbox */}
                    <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.primaryPs4Sold}
                        disabled={!row.primaryPs4Code}
                        onChange={(e) => handleCellChange(row._itemId, 'primaryPs4Sold', e.target.checked)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Primary PS5 Code */}
                    <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.primaryPs5Code || ''}
                        placeholder="PS5 Key"
                        onChange={(e) => handleCellChange(row._itemId, 'primaryPs5Code', e.target.value)}
                        className="w-full h-8 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.primaryPs5Sold}
                        disabled={!row.primaryPs5Code}
                        onChange={(e) => handleCellChange(row._itemId, 'primaryPs5Sold', e.target.checked)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Secondary Code */}
                    <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.secondaryCode || ''}
                        placeholder="Secondary Key"
                        onChange={(e) => handleCellChange(row._itemId, 'secondaryCode', e.target.value)}
                        className="w-full h-8 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.secondarySold}
                        disabled={!row.secondaryCode}
                        onChange={(e) => handleCellChange(row._itemId, 'secondarySold', e.target.checked)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Offline PS4 Code */}
                    <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.offlinePs4Code || ''}
                        placeholder="Offline PS4 Key"
                        onChange={(e) => handleCellChange(row._itemId, 'offlinePs4Code', e.target.value)}
                        className="w-full h-8 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.offlinePs4Sold}
                        disabled={!row.offlinePs4Code}
                        onChange={(e) => handleCellChange(row._itemId, 'offlinePs4Sold', e.target.checked)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Offline PS5 Code */}
                    <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.offlinePs5Code || ''}
                        placeholder="Offline PS5 Key"
                        onChange={(e) => handleCellChange(row._itemId, 'offlinePs5Code', e.target.value)}
                        className="w-full h-8 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.offlinePs5Sold}
                        disabled={!row.offlinePs5Code}
                        onChange={(e) => handleCellChange(row._itemId, 'offlinePs5Sold', e.target.checked)}
                        className="rounded text-brand-red focus:ring-brand-red"
                      />
                    </td>

                    {/* Individual Row Action */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          setRows(prev => prev.map(r => r._itemId === row._itemId ? { ...r, _isDeleted: true } : r));
                        }}
                        className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={20} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-display">
                    No matching rows found in spreadsheet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Floating Status / Save Toolbar */}
      {unsavedChangesCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:left-72 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-6 py-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce-subtle">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
            <span className="font-bold">{unsavedChangesCount} unsaved inventory changes.</span>
            <span className="hidden md:inline text-xs text-gray-400">(Your edits are held locally until saved)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <RotateCcw className="w-4 h-4" /> Discard
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs py-2 bg-brand-red text-white"
            >
              {saving ? 'Saving...' : 'Save Changes'}
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Add / Paste Importer Modal */}
      <Modal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        title="Smart Copy-Paste Bulk Account Parser"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase">
              1. Select Product / Game
            </label>
            <select
              value={bulkAddProductId}
              onChange={(e) => setBulkAddProductId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="">Choose product...</option>
              {products.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                2. Input Text Format
              </label>
              <select
                value={bulkAddFormat}
                onChange={(e) => setBulkAddFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="email:pass">Email:Password</option>
                <option value="email:pass:outlook:outlookpass">Email:Password:Outlook:OutlookPass</option>
                <option value="codes_only">License Codes Only</option>
              </select>
            </div>

            {bulkAddFormat === 'codes_only' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                  Target Slot for Codes
                </label>
                <select
                  value={bulkAddSlot}
                  onChange={(e) => setBulkAddSlot(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="Primary ps4">Primary PS4</option>
                  <option value="Primary ps5">Primary PS5</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Offline ps4">Offline PS4</option>
                  <option value="Offline ps5">Offline PS5</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase">
              3. Paste Raw Accounts List (one per line)
            </label>
            <textarea
              rows={6}
              value={bulkAddRawText}
              onChange={(e) => setBulkAddRawText(e.target.value)}
              placeholder={
                bulkAddFormat === 'email:pass'
                  ? 'alex@gmail.com:sonyPass123\nsam@outlook.com:sonyPass456'
                  : bulkAddFormat === 'codes_only'
                  ? 'KEY-ABCD-1234\nKEY-EFGH-5678'
                  : 'alex@gmail.com:sonyPass123:alex_outlook@outlook.com:outlookPass123\nsam@outlook.com:sonyPass456:sam_outlook@outlook.com:outlookPass456'
              }
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsBulkAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddSubmit}
              className="bg-brand-red text-white"
            >
              Import Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
