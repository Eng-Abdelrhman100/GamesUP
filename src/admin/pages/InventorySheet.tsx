import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { productsAPI, categoriesAPI, api, uploadAPI, normalizeImageSrc } from '@/utils/api';
import { 
  Search, Plus, Trash2, Save, RotateCcw, Download, Upload, 
  ChevronDown, ChevronUp, Check, AlertCircle, RefreshCw, Eye, Edit
} from 'lucide-react';

interface ProductRow {
  id: string | number;
  name: string;
  category_slug: string | null;
  sub_category_slug: string | null;
  price: number | null;
  cost: number | null;
  stock: number;
  image: string | null;
  description: string | null;
  status: string;
  productCode: string | null;
  purchasedEmail: string | null;
  purchasedPassword: string | null;
  instructions: string | null;
  sendEmailEnabled: boolean;
  emailTemplate: string | null;
  digitalItems: any[]; // Array of nested stock accounts

  // Local state modifiers
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

function checkDuplicateEmailOrCode(itemsToCheck: any[]) {
  const emails = new Set();
  const codes = new Set();

  for (const item of itemsToCheck) {
    const itemEmails = new Set();
    if (item.email) {
      const emailClean = item.email.trim().toLowerCase();
      if (emailClean) {
        if (emails.has(emailClean)) {
          return `Duplicate email "${item.email}" found in the stock list.`;
        }
        itemEmails.add(emailClean);
      }
    }
    if (item.outlookEmail) {
      const outlookClean = item.outlookEmail.trim().toLowerCase();
      if (outlookClean) {
        if (emails.has(outlookClean) && !itemEmails.has(outlookClean)) {
          return `Duplicate email "${item.outlookEmail}" found in the stock list.`;
        }
        itemEmails.add(outlookClean);
      }
    }
    itemEmails.forEach(e => emails.add(e));

    const itemCodes = new Set();
    if (item.code) {
      const codeClean = item.code.trim().toLowerCase();
      if (codeClean) {
        if (codes.has(codeClean)) {
          return `Duplicate code "${item.code}" found in the stock list.`;
        }
        itemCodes.add(codeClean);
      }
    }
    if (item.slots) {
      for (const slotName of Object.keys(item.slots)) {
        const slotCode = item.slots[slotName]?.code ? String(item.slots[slotName].code).trim().toLowerCase() : '';
        if (slotCode) {
          if (codes.has(slotCode) && !itemCodes.has(slotCode)) {
            return `Duplicate code "${item.slots[slotName].code}" found in the stock list.`;
          }
          itemCodes.add(slotCode);
        }
      }
    }
    itemCodes.forEach(c => codes.add(c));
  }
  return null;
}

function getProductDuplicates(digitalItems: any[]) {
  const duplicateEmails = new Set<string>();
  const duplicateCodes = new Set<string>();

  const emailsCount: Record<string, number> = {};
  const codesCount: Record<string, number> = {};

  for (const item of digitalItems) {
    const itemEmails = new Set<string>();
    if (item.email) {
      const emailClean = item.email.trim().toLowerCase();
      if (emailClean) {
        itemEmails.add(emailClean);
      }
    }
    if (item.outlookEmail) {
      const outlookClean = item.outlookEmail.trim().toLowerCase();
      if (outlookClean) {
        itemEmails.add(outlookClean);
      }
    }
    
    itemEmails.forEach(email => {
      emailsCount[email] = (emailsCount[email] || 0) + 1;
    });

    if (item.code) {
      const codeClean = item.code.trim().toLowerCase();
      if (codeClean) {
        codesCount[codeClean] = (codesCount[codeClean] || 0) + 1;
      }
    }
    if (item.slots) {
      for (const slotName of Object.keys(item.slots)) {
        const slotCode = item.slots[slotName]?.code ? String(item.slots[slotName].code).trim().toLowerCase() : '';
        if (slotCode) {
          codesCount[slotCode] = (codesCount[slotCode] || 0) + 1;
        }
      }
    }
  }

  for (const [email, count] of Object.entries(emailsCount)) {
    if (count > 1) {
      duplicateEmails.add(email);
    }
  }
  for (const [code, count] of Object.entries(codesCount)) {
    if (count > 1) {
      duplicateCodes.add(code);
    }
  }

  return { duplicateEmails, duplicateCodes };
}

export function InventorySheet() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  
  const [originalRows, setOriginalRows] = useState<ProductRow[]>([]);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);

  // Compute a map of orderId -> Customer Email for quick lookup in inventory
  const orderMap = useMemo(() => {
    const map: Record<string, string> = {};
    orders.forEach(o => {
      const id = String(o.id);
      const num = String(o.order_number || '');
      const email = o.customer_email || o.customer_name || 'Unknown';
      map[id] = email;
      if (num) map[num] = email;
    });
    return map;
  }, [orders]);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Expanded details states (Master-Detail expansion)
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string | number>>(new Set());

  // Selection states (for bulk operations)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string | number>>(new Set());

  // Bulk actions states
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriceChangeType, setBulkPriceChangeType] = useState<'set' | 'add' | 'multiply'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState('');

  // Importer states (Bulk Add modal)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddProductId, setBulkAddProductId] = useState('');
  const [bulkAddRawText, setBulkAddRawText] = useState('');
  const [bulkAddFormat, setBulkAddFormat] = useState<'email:pass' | 'email:pass:outlook:outlookpass' | 'codes_only'>('email:pass');
  const [bulkAddSlot, setBulkAddSlot] = useState<'Primary ps4' | 'Primary ps5' | 'Secondary' | 'Offline ps4' | 'Offline ps5'>('Primary ps4');

  // Description / Details modal state
  const [editingDescriptionProdId, setEditingDescriptionProdId] = useState<string | number | null>(null);
  const [descriptionModalData, setDescriptionModalData] = useState({
    name: '',
    description: '',
    instructions: ''
  });

  const calculateProductStock = (row: ProductRow) => {
    if (!row.digitalItems || row.digitalItems.length === 0) {
      return row.stock; // If physical/giftcard without items, return manual stock value
    }
    let count = 0;
    row.digitalItems.forEach(item => {
      if (item && item.slots) {
        Object.values(item.slots).forEach((slot: any) => {
          if (slot && slot.code && !slot.sold) {
            count++;
          }
        });
      }
    });
    return count;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [catsRes, subCatsRes, productsRes, ordersRes] = await Promise.all([
        categoriesAPI.getAll(),
        api.get('sub_categories'),
        productsAPI.getAll(),
        api.get('orders')
      ]);

      setCategories(catsRes || []);
      setSubCategories(subCatsRes || []);
      setOrders(ordersRes?.orders || ordersRes || []);
      
      const productList = productsRes.products || productsRes || [];
      setProducts(productList);

      const formatted: ProductRow[] = productList.map((p: any) => {
        let items: any[] = [];
        try {
          const rawItems = p.digitalItems || p.digital_items;
          if (rawItems) {
            items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
          }
        } catch (e) {
          console.error('Failed to parse digital items for product', p.id, e);
        }

        return {
          id: p.id,
          name: p.name || '',
          category_slug: p.category_slug || null,
          sub_category_slug: p.sub_category_slug || null,
          price: p.price != null ? parseFloat(String(p.price)) : null,
          cost: p.cost != null ? parseFloat(String(p.cost)) : null,
          stock: p.stock != null ? parseInt(String(p.stock)) : 0,
          image: p.image || null,
          description: p.description || null,
          status: p.status || 'In Stock',
          productCode: p.productCode || null,
          purchasedEmail: p.purchasedEmail || null,
          purchasedPassword: p.purchasedPassword || null,
          instructions: p.instructions || null,
          sendEmailEnabled: !!p.sendEmailEnabled,
          emailTemplate: p.emailTemplate || null,
          digitalItems: items
        };
      });

      setOriginalRows(JSON.parse(JSON.stringify(formatted)));
      setRows(formatted);
      setSelectedProductIds(new Set());
      setExpandedProductIds(new Set());
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      setError(err.message || 'Failed to load store inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        const role = String(parsed?.user_metadata?.role || '').toLowerCase();
        const perms = parsed?.user_metadata?.permissions || {};
        
        // Check if user has at least read permission for products
        const canRead = perms.products === 'read' || perms.products === 'write' || perms.products === true;
        const isLegacyAdmin = role === 'admin' || role === 'manager';

        setIsAdmin(isLegacyAdmin || canRead);
        setIsSuperAdmin(role === 'admin');
      }
    } catch (e) {}
    loadData();
  }, []);

  // Compute local unsaved changes count
  const unsavedChangesCount = useMemo(() => {
    let count = 0;
    rows.forEach(r => {
      if (r._isNew && !r._isDeleted) count++;
      else if (r._isDeleted && !r._isNew) count++;
      else if (r._isModified && !r._isDeleted) count++;
    });
    return count;
  }, [rows]);

  const handleReset = () => {
    if (confirm('Discard all unsaved changes and reload original data?')) {
      setRows(JSON.parse(JSON.stringify(originalRows)));
      setSelectedProductIds(new Set());
      setExpandedProductIds(new Set());
    }
  };

  // Modify cell value in product level
  const handleCellChange = (productId: string | number, field: keyof ProductRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === productId) {
        const updated = { ...row, [field]: value, _isModified: true };
        
        // Auto-calculate stock in case stock field was edited manually
        if (field === 'stock') {
          updated.stock = parseInt(value) || 0;
        }

        // Auto change status if stock becomes 0 or vice versa
        if (field === 'stock' || field === 'digitalItems') {
          const sVal = calculateProductStock(updated);
          updated.status = sVal > 0 ? 'In Stock' : 'Out of Stock';
        }

        return updated;
      }
      return row;
    }));
  };

  // Modify digital item field inside a product
  const handleDigitalItemChange = (productId: string | number, itemId: string, field: string, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === productId) {
        const updatedDigitalItems = (row.digitalItems || []).map(item => {
          if (item.id === itemId) {
            return { ...item, [field]: value };
          }
          return item;
        });

        const updated = { ...row, digitalItems: updatedDigitalItems, _isModified: true };
        updated.stock = calculateProductStock(updated);
        updated.status = updated.stock > 0 ? 'In Stock' : 'Out of Stock';
        return updated;
      }
      return row;
    }));
  };

  // Modify slot settings inside a digital item
  const handleDigitalItemSlotChange = (
    productId: string | number, 
    itemId: string, 
    slotName: string, 
    key: 'code' | 'sold', 
    value: any
  ) => {
    setRows(prev => prev.map(row => {
      if (row.id === productId) {
        const updatedDigitalItems = (row.digitalItems || []).map(item => {
          if (item.id === itemId) {
            const slots = { ...(item.slots || {}) };
            const slot = slots[slotName] || { sold: false, orderId: null, code: '' };
            slots[slotName] = { ...slot, [key]: value };
            
            return {
              ...item,
              slots,
              totalCodes: Object.keys(slots).length
            };
          }
          return item;
        });

        const updated = { ...row, digitalItems: updatedDigitalItems, _isModified: true };
        updated.stock = calculateProductStock(updated);
        updated.status = updated.stock > 0 ? 'In Stock' : 'Out of Stock';
        return updated;
      }
      return row;
    }));
  };

  // Add blank product row
  const handleAddProductRow = () => {
    const newProduct: ProductRow = {
      id: 'new_' + crypto.randomUUID(),
      name: '',
      category_slug: categories[0]?.slug || null,
      sub_category_slug: null,
      price: 0,
      cost: 0,
      stock: 0,
      image: '',
      description: '',
      status: 'In Stock',
      productCode: '',
      purchasedEmail: '',
      purchasedPassword: '',
      instructions: '',
      sendEmailEnabled: false,
      emailTemplate: '',
      digitalItems: [],
      _isNew: true
    };
    setRows(prev => [newProduct, ...prev]);
  };

  // Add nested digital stock item row inside product
  const handleAddDigitalItemRow = (productId: string | number) => {
    setRows(prev => prev.map(row => {
      if (row.id === productId) {
        const newItem = {
          id: crypto.randomUUID(),
          email: '',
          password: '',
          outlookEmail: '',
          outlookPassword: '',
          region: '',
          onlineId: '',
          backupCodes: '',
          slots: {
            'Primary ps4': { sold: false, orderId: null, code: '' },
            'Primary ps5': { sold: false, orderId: null, code: '' },
            'Secondary': { sold: false, orderId: null, code: '' },
            'Offline ps4': { sold: false, orderId: null, code: '' },
            'Offline ps5': { sold: false, orderId: null, code: '' }
          },
          totalCodes: 0,
          assignedGroup: 'All Groups'
        };

        const updated = {
          ...row,
          digitalItems: [newItem, ...(row.digitalItems || [])],
          _isModified: true
        };
        updated.stock = calculateProductStock(updated);
        updated.status = updated.stock > 0 ? 'In Stock' : 'Out of Stock';
        return updated;
      }
      return row;
    }));

    // Auto expand row to show newly added item
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  // Remove digital item from list
  const handleDeleteDigitalItemRow = (productId: string | number, itemId: string) => {
    if (!confirm('Remove this digital account set from product stock?')) return;

    setRows(prev => prev.map(row => {
      if (row.id === productId) {
        const updatedItems = (row.digitalItems || []).filter(item => item.id !== itemId);
        const updated = {
          ...row,
          digitalItems: updatedItems,
          _isModified: true
        };
        updated.stock = calculateProductStock(updated);
        updated.status = updated.stock > 0 ? 'In Stock' : 'Out of Stock';
        return updated;
      }
      return row;
    }));
  };

  // Toggle expansion of a product row
  const handleToggleExpandProduct = (productId: string | number) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Toggle select checkbox for a row
  const handleToggleSelectRow = (productId: string | number) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Master checkbox selection handlers
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (row._isDeleted) return false;

      // Filter by category
      if (categoryFilter !== 'all' && row.category_slug !== categoryFilter) {
        return false;
      }

      // Filter by status
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      // Filter by search text
      if (searchTerm.trim() !== '') {
        const s = searchTerm.toLowerCase();
        const matches = 
          row.name.toLowerCase().includes(s) ||
          (row.category_slug || '').toLowerCase().includes(s) ||
          (row.status || '').toLowerCase().includes(s) ||
          (row.productCode || '').toLowerCase().includes(s) ||
          (row.purchasedEmail || '').toLowerCase().includes(s) ||
          (row.digitalItems || []).some((item: any) => 
            (item.email || '').toLowerCase().includes(s) ||
            (item.password || '').toLowerCase().includes(s) ||
            (item.outlookEmail || '').toLowerCase().includes(s) ||
            Object.values(item.slots || {}).some((slot: any) => 
              (slot?.code || '').toLowerCase().includes(s)
            )
          );
        
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, categoryFilter, statusFilter, searchTerm]);

  const isAllSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.every(row => selectedProductIds.has(row.id));
  }, [filteredRows, selectedProductIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds(prev => {
        const next = new Set(prev);
        filteredRows.forEach(row => next.delete(row.id));
        return next;
      });
    } else {
      setSelectedProductIds(prev => {
        const next = new Set(prev);
        filteredRows.forEach(row => next.add(row.id));
        return next;
      });
    }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (selectedProductIds.size === 0) return;
    if (!confirm(`Soft-delete the ${selectedProductIds.size} selected products? (These will be deleted upon clicking Save Changes)`)) return;

    setRows(prev => prev.map(row => {
      if (selectedProductIds.has(row.id)) {
        return { ...row, _isDeleted: true };
      }
      return row;
    }));
    setSelectedProductIds(new Set());
  };

  const handleBulkApplyCategory = () => {
    if (!bulkCategory || selectedProductIds.size === 0) return;
    setRows(prev => prev.map(row => {
      if (selectedProductIds.has(row.id)) {
        return { ...row, category_slug: bulkCategory, _isModified: true };
      }
      return row;
    }));
    setSelectedProductIds(new Set());
    setBulkCategory('');
    alert('Category applied to selected products.');
  };

  const handleBulkApplyStatus = () => {
    if (!bulkStatus || selectedProductIds.size === 0) return;
    setRows(prev => prev.map(row => {
      if (selectedProductIds.has(row.id)) {
        return { ...row, status: bulkStatus, _isModified: true };
      }
      return row;
    }));
    setSelectedProductIds(new Set());
    setBulkStatus('');
    alert('Status applied to selected products.');
  };

  const handleBulkApplyPrice = () => {
    const val = parseFloat(bulkPriceValue);
    if (isNaN(val) || selectedProductIds.size === 0) return;

    setRows(prev => prev.map(row => {
      if (selectedProductIds.has(row.id)) {
        const currentPrice = row.price || 0;
        let newPrice = currentPrice;
        if (bulkPriceChangeType === 'set') {
          newPrice = val;
        } else if (bulkPriceChangeType === 'add') {
          newPrice = currentPrice + val;
        } else if (bulkPriceChangeType === 'multiply') {
          newPrice = currentPrice * val;
        }
        return { ...row, price: parseFloat(newPrice.toFixed(2)), _isModified: true };
      }
      return row;
    }));

    setSelectedProductIds(new Set());
    setBulkPriceValue('');
    alert('Price updates applied successfully.');
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (unsavedChangesCount === 0) return;

    // Validate duplicates for all active rows before saving
    for (const row of rows) {
      if (!row._isDeleted) {
        const dupError = checkDuplicateEmailOrCode(row.digitalItems || []);
        if (dupError) {
          alert(`Error saving changes for "${row.name}":\n${dupError}`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      setError(null);

      for (const row of rows) {
        if (row._isDeleted) {
          if (!String(row.id).startsWith('new_')) {
            await productsAPI.delete(row.id);
          }
        } else if (row._isNew) {
          const payload = {
            name: row.name || 'New Game',
            category_slug: row.category_slug,
            sub_category_slug: row.sub_category_slug,
            price: row.price != null ? parseFloat(String(row.price)) : 0,
            cost: row.cost != null ? parseFloat(String(row.cost)) : 0,
            stock: calculateProductStock(row),
            image: row.image,
            description: row.description || '',
            status: row.stock > 0 ? 'In Stock' : 'Out of Stock',
            productCode: row.productCode,
            purchasedEmail: row.purchasedEmail,
            purchasedPassword: row.purchasedPassword,
            instructions: row.instructions || '',
            sendEmailEnabled: !!row.sendEmailEnabled,
            emailTemplate: row.emailTemplate,
            digitalItems: row.digitalItems || []
          };
          await productsAPI.create(payload);
        } else if (row._isModified) {
          const payload = {
            name: row.name,
            category_slug: row.category_slug,
            sub_category_slug: row.sub_category_slug,
            price: row.price != null ? parseFloat(String(row.price)) : 0,
            cost: row.cost != null ? parseFloat(String(row.cost)) : 0,
            stock: calculateProductStock(row),
            image: row.image,
            description: row.description || '',
            status: row.status,
            productCode: row.productCode,
            purchasedEmail: row.purchasedEmail,
            purchasedPassword: row.purchasedPassword,
            instructions: row.instructions || '',
            sendEmailEnabled: !!row.sendEmailEnabled,
            emailTemplate: row.emailTemplate,
            digitalItems: row.digitalItems || []
          };
          await productsAPI.update(row.id, payload);
        }
      }

      alert('All changes saved successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      setError(err.message || 'Failed to save product spreadsheet changes.');
    } finally {
      setSaving(false);
    }
  };

  // CSV Export & Import
  const handleCsvExport = () => {
    if (filteredRows.length === 0) {
      alert('No rows available to export');
      return;
    }

    const headers = [
      'ProductName', 'Category', 'SubCategory', 'Price', 'Cost', 'Stock', 'Status', 'ProductCode', 'PurchasedEmail', 'PurchasedPassword', 'SendEmailEnabled', 'EmailTemplate',
      'Email', 'Password', 'OutlookEmail', 'OutlookPassword', 'Region', 'OnlineID', 'BackupCodes', 
      'PrimaryPS4Code', 'PrimaryPS4Sold',
      'PrimaryPS5Code', 'PrimaryPS5Sold',
      'SecondaryCode', 'SecondarySold',
      'OfflinePS4Code', 'OfflinePS4Sold',
      'OfflinePS5Code', 'OfflinePS5Sold'
    ];

    const csvLines: string[] = [headers.join(',')];

    filteredRows.forEach(row => {
      const prodInfo = [
        `"${(row.name || '').replace(/"/g, '""')}"`,
        `"${(row.category_slug || '').replace(/"/g, '""')}"`,
        `"${(row.sub_category_slug || '').replace(/"/g, '""')}"`,
        row.price || 0,
        row.cost || 0,
        row.stock || 0,
        `"${(row.status || '').replace(/"/g, '""')}"`,
        `"${(row.productCode || '').replace(/"/g, '""')}"`,
        `"${(row.purchasedEmail || '').replace(/"/g, '""')}"`,
        `"${(row.purchasedPassword || '').replace(/"/g, '""')}"`,
        row.sendEmailEnabled ? 'true' : 'false',
        `"${(row.emailTemplate || '').replace(/"/g, '""')}"`
      ];

      if (row.digitalItems && row.digitalItems.length > 0) {
        row.digitalItems.forEach(item => {
          const itemInfo = [
            `"${(item.email || '').replace(/"/g, '""')}"`,
            `"${(item.password || '').replace(/"/g, '""')}"`,
            `"${(item.outlookEmail || '').replace(/"/g, '""')}"`,
            `"${(item.outlookPassword || '').replace(/"/g, '""')}"`,
            `"${(item.region || '').replace(/"/g, '""')}"`,
            `"${(item.onlineId || '').replace(/"/g, '""')}"`,
            `"${(item.backupCodes || '').replace(/"/g, '""')}"`,
            `"${(item.slots?.['Primary ps4']?.code || '').replace(/"/g, '""')}"`,
            item.slots?.['Primary ps4']?.sold ? 'true' : 'false',
            `"${(item.slots?.['Primary ps5']?.code || '').replace(/"/g, '""')}"`,
            item.slots?.['Primary ps5']?.sold ? 'true' : 'false',
            `"${(item.slots?.['Secondary']?.code || '').replace(/"/g, '""')}"`,
            item.slots?.['Secondary']?.sold ? 'true' : 'false',
            `"${(item.slots?.['Offline ps4']?.code || '').replace(/"/g, '""')}"`,
            item.slots?.['Offline ps4']?.sold ? 'true' : 'false',
            `"${(item.slots?.['Offline ps5']?.code || '').replace(/"/g, '""')}"`,
            item.slots?.['Offline ps5']?.sold ? 'true' : 'false'
          ];
          csvLines.push([...prodInfo, ...itemInfo].join(','));
        });
      } else {
        const emptyItems = Array(17).fill('""');
        csvLines.push([...prodInfo, ...emptyItems].join(','));
      }
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'gamesup_products_spreadsheet.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        let updatedRows = [...rows];

        for (let i = 1; i < lines.length; i++) {
          const rowData = lines[i].split(',').map(val => val.replace(/^["']|["']$/g, '').trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = rowData[idx] || '';
          });

          const pName = obj['ProductName'] || '';
          if (!pName) continue;

          let targetProdIdx = updatedRows.findIndex(r => r.name.toLowerCase() === pName.toLowerCase());

          const hasDigitalItemData = obj['Email'] || obj['Password'] || obj['PrimaryPS4Code'] || obj['PrimaryPS5Code'] || obj['SecondaryCode'];

          let digitalItem: any = null;
          if (hasDigitalItemData) {
            const slots: Record<string, any> = {};
            if (obj['PrimaryPS4Code']) slots['Primary ps4'] = { sold: obj['PrimaryPS4Sold'] === 'true', orderId: null, code: obj['PrimaryPS4Code'] };
            if (obj['PrimaryPS5Code']) slots['Primary ps5'] = { sold: obj['PrimaryPS5Sold'] === 'true', orderId: null, code: obj['PrimaryPS5Code'] };
            if (obj['SecondaryCode']) slots['Secondary'] = { sold: obj['SecondarySold'] === 'true', orderId: null, code: obj['SecondaryCode'] };
            if (obj['OfflinePS4Code']) slots['Offline ps4'] = { sold: obj['OfflinePS4Sold'] === 'true', orderId: null, code: obj['OfflinePS4Code'] };
            if (obj['OfflinePS5Code']) slots['Offline ps5'] = { sold: obj['OfflinePS5Sold'] === 'true', orderId: null, code: obj['OfflinePS5Code'] };

            digitalItem = {
              id: crypto.randomUUID(),
              email: obj['Email'] || '',
              password: obj['Password'] || '',
              outlookEmail: obj['OutlookEmail'] || '',
              outlookPassword: obj['OutlookPassword'] || '',
              region: obj['Region'] || '',
              onlineId: obj['OnlineID'] || '',
              backupCodes: obj['BackupCodes'] || '',
              slots,
              totalCodes: Object.keys(slots).length,
              assignedGroup: 'All Groups'
            };
          }

          if (targetProdIdx >= 0) {
            const prod = updatedRows[targetProdIdx];
            const updatedItems = digitalItem ? [...(prod.digitalItems || []), digitalItem] : (prod.digitalItems || []);
            
            updatedRows[targetProdIdx] = {
              ...prod,
              digitalItems: updatedItems,
              _isModified: true
            };
            updatedRows[targetProdIdx].stock = calculateProductStock(updatedRows[targetProdIdx]);
          } else {
            const newProd: ProductRow = {
              id: 'new_' + crypto.randomUUID(),
              name: pName,
              category_slug: obj['Category'] || categories[0]?.slug || 'games',
              sub_category_slug: obj['SubCategory'] || null,
              price: obj['Price'] ? parseFloat(obj['Price']) : 0,
              cost: obj['Cost'] ? parseFloat(obj['Cost']) : 0,
              stock: obj['Stock'] ? parseInt(obj['Stock']) : 0,
              image: '',
              description: '',
              status: obj['Status'] || 'In Stock',
              productCode: obj['ProductCode'] || null,
              purchasedEmail: obj['PurchasedEmail'] || null,
              purchasedPassword: obj['PurchasedPassword'] || null,
              instructions: '',
              sendEmailEnabled: obj['SendEmailEnabled'] === 'true',
              emailTemplate: obj['EmailTemplate'] || null,
              digitalItems: digitalItem ? [digitalItem] : [],
              _isNew: true
            };
            newProd.stock = calculateProductStock(newProd);
            updatedRows.unshift(newProd);
          }
        }

        // Check for duplicates in updatedRows
        for (const row of updatedRows) {
          const dupError = checkDuplicateEmailOrCode(row.digitalItems || []);
          if (dupError) {
            alert(`CSV Import blocked due to duplicates in "${row.name}":\n${dupError}`);
            return;
          }
        }

        setRows(updatedRows);
        alert('CSV data imported successfully. Verify rows and click Save Changes to persist.');
      } catch (err: any) {
        alert('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Smart Bulk Copy Paste account parser
  const handleBulkAddSubmit = () => {
    if (!bulkAddProductId || !bulkAddRawText.trim()) {
      alert('Please select a product and paste stock accounts data');
      return;
    }

    const lines = bulkAddRawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newItems: any[] = [];

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
        if (bulkAddSlot === 'Primary ps4') primaryPs4Code = line;
        else if (bulkAddSlot === 'Primary ps5') primaryPs5Code = line;
        else if (bulkAddSlot === 'Secondary') secondaryCode = line;
        else if (bulkAddSlot === 'Offline ps4') offlinePs4Code = line;
        else if (bulkAddSlot === 'Offline ps5') offlinePs5Code = line;
      }

      const slots: Record<string, any> = {};
      if (primaryPs4Code) slots['Primary ps4'] = { sold: false, orderId: null, code: primaryPs4Code };
      if (primaryPs5Code) slots['Primary ps5'] = { sold: false, orderId: null, code: primaryPs5Code };
      if (secondaryCode) slots['Secondary'] = { sold: false, orderId: null, code: secondaryCode };
      if (offlinePs4Code) slots['Offline ps4'] = { sold: false, orderId: null, code: offlinePs4Code };
      if (offlinePs5Code) slots['Offline ps5'] = { sold: false, orderId: null, code: offlinePs5Code };

      newItems.push({
        id: crypto.randomUUID(),
        email,
        password,
        outlookEmail,
        outlookPassword,
        region: '',
        onlineId: '',
        backupCodes: '',
        slots,
        totalCodes: Object.keys(slots).length,
        assignedGroup: 'All Groups'
      });
    });

    const targetProd = rows.find(r => String(r.id) === String(bulkAddProductId));
    if (!targetProd) {
      alert('Selected product not found.');
      return;
    }

    const projectedItems = [...newItems, ...(targetProd.digitalItems || [])];
    const duplicateError = checkDuplicateEmailOrCode(projectedItems);
    if (duplicateError) {
      alert(`Bulk addition blocked due to duplicates:\n${duplicateError}`);
      return;
    }

    setRows(prev => prev.map(prod => {
      if (String(prod.id) === String(bulkAddProductId)) {
        const updatedItems = [...newItems, ...(prod.digitalItems || [])];
        const updated = { ...prod, digitalItems: updatedItems, _isModified: true };
        updated.stock = calculateProductStock(updated);
        updated.status = updated.stock > 0 ? 'In Stock' : 'Out of Stock';
        return updated;
      }
      return prod;
    }));

    setIsBulkAddModalOpen(false);
    setBulkAddRawText('');
    alert(`Successfully loaded ${newItems.length} new items to "${rows.find(r=>String(r.id)===String(bulkAddProductId))?.name}". Remember to click "Save Changes" to save to the database.`);
  };

  const openDescriptionModal = (row: ProductRow) => {
    setEditingDescriptionProdId(row.id);
    setDescriptionModalData({
      name: row.name || 'Game Details',
      description: row.description || '',
      instructions: row.instructions || ''
    });
  };

  const saveDescriptionModal = () => {
    if (editingDescriptionProdId === null) return;
    setRows(prev => prev.map(prod => {
      if (prod.id === editingDescriptionProdId) {
        return {
          ...prod,
          description: descriptionModalData.description,
          instructions: descriptionModalData.instructions,
          _isModified: true
        };
      }
      return prod;
    }));
    setEditingDescriptionProdId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        <p className="text-gray-500 dark:text-gray-400 font-display">Loading large spreadsheet data...</p>
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
            Excel-style bulk manager for store games and nested digital stock accounts. Edit cells directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setIsBulkAddModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-1.5 text-xs py-2 bg-brand-red/10 border border-brand-red/20 text-brand-red hover:bg-brand-red/20"
          >
            <Plus className="w-4 h-4" /> Bulk Add Stock accounts
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
            onClick={handleAddProductRow}
            className="flex items-center gap-1.5 text-xs py-2 bg-brand-red text-white"
          >
            <Plus className="w-4 h-4" /> Add Row (Game)
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
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search games, emails, codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
            >
              <option value="all">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <Button 
          onClick={loadData}
          variant="secondary"
          className="flex items-center gap-1.5 text-xs py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </Button>
      </Card>

      {/* Bulk Operations Toolbar */}
      {selectedProductIds.size > 0 && (
        <Card className="p-4 bg-brand-red/5 border border-brand-red/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-red uppercase tracking-wider italic">
              {selectedProductIds.size} products selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Category */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">Set Category...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <Button 
                onClick={handleBulkApplyCategory}
                disabled={!bulkCategory}
                className="px-3 py-1.5 text-xs bg-brand-red text-white"
              >
                Apply
              </Button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">Set Status...</option>
                <option value="In Stock">In Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <Button 
                onClick={handleBulkApplyStatus}
                disabled={!bulkStatus}
                className="px-3 py-1.5 text-xs bg-brand-red text-white"
              >
                Apply
              </Button>
            </div>

            {/* Price change */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkPriceChangeType}
                onChange={(e) => setBulkPriceChangeType(e.target.value as any)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="set">Set Price To</option>
                <option value="add">Add to Price</option>
                <option value="multiply">Multiply Price by</option>
              </select>
              <input
                type="number"
                placeholder="Val..."
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                className="w-16 px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
              />
              <Button 
                onClick={handleBulkApplyPrice}
                disabled={!bulkPriceValue}
                className="px-3 py-1.5 text-xs bg-brand-red text-white"
              >
                Apply
              </Button>
            </div>

            {/* Delete button */}
            <Button 
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Spreadsheet Data Grid */}
      <Card className="border-border-subtle bg-bg-secondary overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed min-w-[2000px]">
            <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 select-none border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <tr>
                <th className="w-12 px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-center"></th>
                <th className="w-12 px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-brand-red focus:ring-brand-red"
                  />
                </th>
                <th className="w-36 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Image
                </th>
                <th className="w-80 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Game / Product Name
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Category
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Sub-Category
                </th>
                <th className="w-28 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Price
                </th>
                {isSuperAdmin && (
                  <th className="w-28 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Cost
                  </th>
                )}
                <th className="w-24 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Stock
                </th>
                <th className="w-36 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Global License Code
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Purchased Email
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Purchased Password
                </th>
                <th className="w-36 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Auto Email
                </th>
                <th className="w-48 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Template
                </th>
                <th className="w-32 px-3 py-3 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.map((row) => {
                const isExpanded = expandedProductIds.has(row.id);
                let rowBg = 'bg-white dark:bg-gray-900';
                if (row._isNew) rowBg = 'bg-green-500/5 dark:bg-green-500/10';
                else if (row._isModified) rowBg = 'bg-orange-500/5 dark:bg-orange-500/10';

                return (
                  <React.Fragment key={row.id}>
                    {/* Main Game Product Row */}
                    <tr className={`${rowBg} hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors`}>
                      {/* Expand Button */}
                      <td className="px-2 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                        <button
                          onClick={() => handleToggleExpandProduct(row.id)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Checkbox */}
                      <td className="px-2 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(row.id)}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded text-brand-red focus:ring-brand-red"
                        />
                      </td>

                      {/* Image Thumbnail Upload/URL */}
                      <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <img 
                            src={normalizeImageSrc(row.image) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzIj48cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHJ4PSI0Ii8+PC9zdmc+'} 
                            alt="Preview"
                            className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                          />
                          <button
                            onClick={() => {
                              const newUrl = prompt('Enter image web URL:', row.image || '');
                              if (newUrl !== null) handleCellChange(row.id, 'image', newUrl);
                            }}
                            className="p-1 text-gray-400 hover:text-brand-red"
                            title="Edit URL"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <label className="p-1 text-gray-400 hover:text-brand-red cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const up = await uploadAPI.uploadImage(file);
                                    if (up && up.url) {
                                      handleCellChange(row.id, 'image', up.url);
                                    }
                                  } catch (err: any) {
                                    alert('Image upload failed: ' + err.message);
                                  }
                                }
                              }}
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                          placeholder="Game / Product Name"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs font-semibold"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-1.5 py-1 border-r border-gray-200 dark:border-gray-700">
                        <select
                          value={row.category_slug || ''}
                          onChange={(e) => handleCellChange(row.id, 'category_slug', e.target.value || null)}
                          className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red bg-transparent text-xs"
                        >
                          <option value="" className="bg-white dark:bg-gray-900 text-black dark:text-white">None</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.slug} className="bg-white dark:bg-gray-900 text-black dark:text-white">{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Sub-Category */}
                      <td className="px-1.5 py-1 border-r border-gray-200 dark:border-gray-700">
                        <select
                          value={row.sub_category_slug || ''}
                          onChange={(e) => handleCellChange(row.id, 'sub_category_slug', e.target.value || null)}
                          className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red bg-transparent text-xs"
                        >
                          <option value="" className="bg-white dark:bg-gray-900 text-black dark:text-white">None</option>
                          {subCategories
                            .filter(sc => {
                              const parentCat = categories.find(c => c.slug === row.category_slug);
                              return parentCat ? String(sc.category_id) === String(parentCat.id) : true;
                            })
                            .map(sc => (
                              <option key={sc.id} value={sc.slug} className="bg-white dark:bg-gray-900 text-black dark:text-white">{sc.name}</option>
                            ))}
                        </select>
                      </td>

                      {/* Price */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="number"
                          step="0.01"
                          value={row.price != null ? row.price : ''}
                          onChange={(e) => handleCellChange(row.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                        />
                      </td>

                      {/* Cost */}
                      {isSuperAdmin && (
                        <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                          <input
                            type="number"
                            step="0.01"
                            value={row.cost != null ? row.cost : ''}
                            onChange={(e) => handleCellChange(row.id, 'cost', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="0.00"
                            className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                          />
                        </td>
                      )}

                      {/* Stock (Read-only if digital items present, otherwise editable) */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/10">
                        <input
                          type="number"
                          value={calculateProductStock(row)}
                          disabled={row.digitalItems && row.digitalItems.length > 0}
                          onChange={(e) => handleCellChange(row.id, 'stock', e.target.value ? parseInt(e.target.value) : 0)}
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs text-center disabled:opacity-75 disabled:text-orange-500 font-bold"
                        />
                      </td>

                      {/* Status */}
                      <td className="px-1.5 py-1 border-r border-gray-200 dark:border-gray-700">
                        <select
                          value={row.status}
                          onChange={(e) => handleCellChange(row.id, 'status', e.target.value)}
                          className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red bg-transparent text-xs"
                        >
                          <option value="In Stock" className="bg-white dark:bg-gray-900 text-black dark:text-white">In Stock</option>
                          <option value="Out of Stock" className="bg-white dark:bg-gray-900 text-black dark:text-white">Out of Stock</option>
                        </select>
                      </td>

                      {/* Product Code */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.productCode || ''}
                          onChange={(e) => handleCellChange(row.id, 'productCode', e.target.value)}
                          placeholder="Global Key/Code"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs font-mono"
                        />
                      </td>

                      {/* Purchased Email */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.purchasedEmail || ''}
                          onChange={(e) => handleCellChange(row.id, 'purchasedEmail', e.target.value)}
                          placeholder="Bought Email"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                        />
                      </td>

                      {/* Purchased Password */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.purchasedPassword || ''}
                          onChange={(e) => handleCellChange(row.id, 'purchasedPassword', e.target.value)}
                          placeholder="Bought Pass"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                        />
                      </td>

                      {/* Send Email Enabled */}
                      <td className="px-1 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                        <input
                          type="checkbox"
                          checked={row.sendEmailEnabled}
                          onChange={(e) => handleCellChange(row.id, 'sendEmailEnabled', e.target.checked)}
                          className="rounded text-brand-red focus:ring-brand-red"
                        />
                      </td>

                      {/* Email Template */}
                      <td className="p-0 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.emailTemplate || ''}
                          onChange={(e) => handleCellChange(row.id, 'emailTemplate', e.target.value)}
                          placeholder="Template ID/Name"
                          className="w-full h-9 px-3 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-center flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openDescriptionModal(row)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                          title="Preview Description / Instructions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAddDigitalItemRow(row.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 hover:text-blue-700 rounded transition-colors"
                          title="Add Digital Stock Account"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setRows(prev => prev.map(r => r.id === row.id ? { ...r, _isDeleted: true } : r));
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500 hover:text-red-700 rounded transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expand Detail View (Nested digital stock table) */}
                    {isExpanded && (() => {
                      const { duplicateEmails, duplicateCodes } = getProductDuplicates(row.digitalItems || []);
                      return (
                        <tr className="bg-gray-50/50 dark:bg-gray-950/40">
                          <td colSpan={16} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                  Digital Stock Accounts & License Keys for "{row.name || 'this game'}"
                                </h4>
                                <Button
                                  onClick={() => handleAddDigitalItemRow(row.id)}
                                  size="sm"
                                  className="bg-brand-red text-white py-1.5 px-3 rounded-lg text-xs"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Stock Credentials Set
                                </Button>
                              </div>

                              {/* Sub-grid table */}
                              {(!row.digitalItems || row.digitalItems.length === 0) ? (
                                <p className="text-xs text-gray-400 italic py-2">No digital stock accounts added yet. Click "+ Add Stock Credentials Set" to populate.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 max-h-[400px] overflow-y-auto">
                                  <table className="w-full text-left text-xs border-collapse table-fixed min-w-[2200px]">
                                    <thead className="bg-gray-100 dark:bg-gray-800/80 font-bold text-gray-500 dark:text-gray-400 shadow-sm border-b border-gray-200 dark:border-gray-800">
                                      <tr>
                                        <th className="w-52 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Account Email</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Password</th>
                                        <th className="w-52 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Outlook Email</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Outlook Pass</th>
                                        <th className="w-24 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Region</th>
                                        <th className="w-32 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Online ID</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Backup Codes</th>
                                        
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Primary PS4 Code</th>
                                        <th className="w-16 px-1 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sold</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Primary PS5 Code</th>
                                        <th className="w-16 px-1 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sold</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Secondary Code</th>
                                        <th className="w-16 px-1 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sold</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Offline PS4 Code</th>
                                        <th className="w-16 px-1 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sold</th>
                                        <th className="w-40 px-3 py-2.5 border-r border-gray-200 dark:border-gray-800">Offline PS5 Code</th>
                                        <th className="w-16 px-1 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sold</th>

                                        <th className="w-16 px-3 py-2.5 text-center">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                      {(row.digitalItems || []).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-100/50 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900 transition-colors">
                                          
                                          {/* Standard Credentials Fields */}
                                          {[
                                            { field: 'email', placeholder: 'Email Address' },
                                            { field: 'password', placeholder: 'Sony Password' },
                                            { field: 'outlookEmail', placeholder: 'Recovery Email' },
                                            { field: 'outlookPassword', placeholder: 'Recovery Password' },
                                            { field: 'region', placeholder: 'US, EU, etc.' },
                                            { field: 'onlineId', placeholder: 'Online ID' },
                                            { field: 'backupCodes', placeholder: '2FA Backup Codes' }
                                          ].map(col => {
                                            const val = item[col.field] || '';
                                            const isDup = (col.field === 'email' || col.field === 'outlookEmail') &&
                                              val.trim() &&
                                              duplicateEmails.has(val.trim().toLowerCase());
                                            return (
                                              <td key={col.field} className="p-0 border-r border-gray-200 dark:border-gray-800">
                                                <input
                                                  type="text"
                                                  value={item[col.field] || ''}
                                                  placeholder={col.placeholder}
                                                  onChange={(e) => handleDigitalItemChange(row.id, item.id, col.field, e.target.value)}
                                                  title={isDup ? "⚠️ Duplicate: Already added for this product!" : col.placeholder}
                                                  className={`w-full h-8 px-3 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-red ${
                                                    isDup
                                                      ? 'border border-red-500 bg-red-500/10 text-red-955 dark:text-red-200 placeholder-red-400 font-semibold animate-pulse'
                                                      : 'border-none text-gray-900 dark:text-white'
                                                  }`}
                                                />
                                              </td>
                                            );
                                          })}

                                          {/* Slots & Sold Checkboxes */}
                                          {[
                                            'Primary ps4',
                                            'Primary ps5',
                                            'Secondary',
                                            'Offline ps4',
                                            'Offline ps5'
                                          ].map(slotName => {
                                            const slotVal = item.slots?.[slotName]?.code || '';
                                            const isSlotDup = slotVal.trim() && duplicateCodes.has(slotVal.trim().toLowerCase());
                                            return (
                                              <React.Fragment key={slotName}>
                                                {/* Code Cell */}
                                                <td className="p-0 border-r border-gray-200 dark:border-gray-800">
                                                  <input
                                                    type="text"
                                                    value={item.slots?.[slotName]?.code || ''}
                                                    placeholder={`${slotName} Key`}
                                                    onChange={(e) => handleDigitalItemSlotChange(row.id, item.id, slotName, 'code', e.target.value)}
                                                    title={isSlotDup ? "⚠️ Duplicate slot code: Already added for this product!" : `${slotName} Key`}
                                                    className={`w-full h-8 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-red bg-transparent ${
                                                      isSlotDup
                                                        ? 'border border-red-500 bg-red-500/10 text-red-955 dark:text-red-200 placeholder-red-400 font-semibold animate-pulse'
                                                        : 'border-none text-gray-900 dark:text-white'
                                                    }`}
                                                  />
                                                </td>
                                                {/* Sold Checkbox Cell */}
                                                <td className="px-1 py-1 border-r border-gray-200 dark:border-gray-800 text-center relative group">
                                                  <div className="flex flex-col items-center justify-center gap-1">
                                                    <input
                                                      type="checkbox"
                                                      checked={!!item.slots?.[slotName]?.sold}
                                                      disabled={!item.slots?.[slotName]?.code}
                                                      onChange={(e) => handleDigitalItemSlotChange(row.id, item.id, slotName, 'sold', e.target.checked)}
                                                      className="rounded text-brand-red focus:ring-brand-red"
                                                    />
                                                    {item.slots?.[slotName]?.sold && (
                                                      <span className="text-[8px] text-gray-400 font-medium tracking-tighter truncate max-w-[50px]" title={item.slots?.[slotName]?.orderId ? `Order #${item.slots[slotName].orderId}: ${orderMap[String(item.slots[slotName].orderId)] || 'Manual'}` : 'Sold (No Order ID)'}>
                                                        {item.slots?.[slotName]?.orderId ? `#${item.slots[slotName].orderId}` : 'Sold'}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}

                                          {/* Delete Action */}
                                          <td className="px-2 py-1 text-center">
                                            <button
                                              onClick={() => handleDeleteDigitalItemRow(row.id, item.id)}
                                              className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                                              title="Delete account stock row"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-display">
                    No matching products/games found in spreadsheet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Floating Status / Save Toolbar */}
      {unsavedChangesCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:left-72 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-6 py-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
            <span className="font-bold">{unsavedChangesCount} unsaved product changes.</span>
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
        title="Smart Bulk Account Stock Parser"
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
              {rows.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name || '(Unnamed Product)'}</option>
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
              Parse & Load
            </Button>
          </div>
        </div>
      </Modal>

      {/* Description / Extra Details Modal */}
      {editingDescriptionProdId !== null && (
        <Modal
          isOpen={true}
          onClose={() => setEditingDescriptionProdId(null)}
          title={`Additional Details: ${descriptionModalData.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                Product Description
              </label>
              <textarea
                rows={5}
                value={descriptionModalData.description}
                onChange={(e) => setDescriptionModalData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Game overview, attributes, and public description..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                Customer Delivery Instructions
              </label>
              <textarea
                rows={5}
                value={descriptionModalData.instructions}
                onChange={(e) => setDescriptionModalData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Specific instructions automatically sent to customer upon purchase..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="secondary"
                onClick={() => setEditingDescriptionProdId(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveDescriptionModal}
                className="bg-brand-red text-white"
              >
                Apply Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
