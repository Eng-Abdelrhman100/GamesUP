import { Product, Invoice } from '../types';

const DEFAULT_API_URL = 'https://admin.games-up.co/api';

export interface PendingSyncItem {
  id: string;
  type: 'invoice' | 'product_create' | 'product_update' | 'product_delete';
  payload: any;
  timestamp: number;
}

// Seed gaming store products for instant testing / offline demo
export const SEED_GAMING_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'PlayStation 5 Slim 1TB Disc Edition',
    categorySlug: 'consoles',
    price: 34500,
    cost: 31000,
    stock: 8,
    sku: 'GUP-PS5-HW-SLIM-101',
    barcode: '6224005100018',
    productType: 'console',
    platform: 'PS5',
    isTaxable: true,
    requiresSerial: true,
    syncStatus: 'synced',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'prod_2',
    name: 'PS5 DualSense Wireless Controller (Midnight Black)',
    categorySlug: 'accessories',
    price: 4200,
    cost: 3500,
    stock: 24,
    sku: 'GUP-PS5-ACC-CTRL-BLK',
    barcode: '6224005100025',
    productType: 'accessory',
    platform: 'PS5',
    isTaxable: true,
    requiresSerial: true,
    syncStatus: 'synced',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'prod_3',
    name: 'EA Sports FC 25 (PS5 Physical Disc)',
    categorySlug: 'physical-games',
    price: 3800,
    cost: 3200,
    stock: 35,
    sku: 'GUP-PS5-DISC-FC25',
    barcode: '6224005100032',
    productType: 'physical',
    platform: 'PS5',
    isTaxable: true,
    syncStatus: 'synced',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'prod_4',
    name: 'Grand Theft Auto V (PS4/PS5 Digital Account)',
    categorySlug: 'digital-games',
    price: 950,
    cost: 500,
    stock: 15,
    sku: 'GUP-PS4-DIG-GTAV-01',
    barcode: '6224005100049',
    productType: 'digital',
    platform: 'PS4',
    isTaxable: false,
    syncStatus: 'synced',
    digitalItems: [
      {
        email: 'gtav.user1@gamesup.store',
        password: 'SecurePass@2026',
        code: 'SLOT-8821',
        slots: {
          'PS4 Primary': { sold: false, orderId: null, code: 'PRI-PS4-01' },
          'PS5 Primary': { sold: false, orderId: null, code: 'PRI-PS5-01' },
          'Secondary': { sold: false, orderId: null, code: 'SEC-01' }
        }
      }
    ],
    product_variants: [
      { id: 'v1', name: 'PS4 Primary', price: 950, cost: 500, stock: 1 },
      { id: 'v2', name: 'PS5 Primary', price: 1100, cost: 600, stock: 1 },
      { id: 'v3', name: 'Secondary', price: 650, cost: 350, stock: 1 }
    ],
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'prod_5',
    name: 'PlayStation Plus Extra 12 Months (Digital Account)',
    categorySlug: 'playstation-plus',
    price: 3600,
    cost: 2900,
    stock: 12,
    sku: 'GUP-SUB-EXTRA-12M',
    barcode: '6224005100056',
    productType: 'digital',
    platform: 'PS5',
    isTaxable: false,
    syncStatus: 'synced',
    digitalItems: [
      {
        email: 'psplus.extra@gamesup.store',
        password: 'PlusPass@2026',
        code: 'PLUS-7744',
        slots: {
          'PS4 Primary': { sold: false, orderId: null, code: 'PLUS-PRI-4' },
          'PS5 Primary': { sold: false, orderId: null, code: 'PLUS-PRI-5' },
          'Secondary': { sold: false, orderId: null, code: 'PLUS-SEC' }
        }
      }
    ],
    product_variants: [
      { id: 'v4', name: 'PS4 Primary', price: 3600, cost: 2900, stock: 1 },
      { id: 'v5', name: 'PS5 Primary', price: 3900, cost: 3100, stock: 1 },
      { id: 'v6', name: 'Secondary', price: 2800, cost: 2200, stock: 1 }
    ],
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'prod_6',
    name: 'PlayStation Store $50 USD Wallet Gift Card',
    categorySlug: 'gift-cards',
    price: 2750,
    cost: 2500,
    stock: 50,
    sku: 'GUP-CARD-PSN-50USD',
    barcode: '6224005100063',
    productType: 'card',
    platform: 'GENERAL',
    isTaxable: false,
    syncStatus: 'synced',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=600&auto=format&fit=crop'
  }
];

export class PosApiService {
  private baseUrl: string;
  private token: string = '';

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    const saved = localStorage.getItem('gamesup_pos_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiUrl) this.baseUrl = parsed.apiUrl.replace(/\/$/, '');
        if (parsed.apiToken) this.token = parsed.apiToken;
      } catch {}
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private normalizeProduct(raw: any): Product {
    return {
      id: String(raw.id || `prod_${Date.now()}`),
      name: raw.name || 'Untitled Gaming Product',
      description: raw.description || '',
      categorySlug: raw.category_slug || raw.categorySlug || 'physical-games',
      subCategorySlug: raw.sub_category_slug || raw.subCategorySlug,
      price: Number(raw.price || 0),
      cost: Number(raw.cost || 0),
      stock: Number(raw.stock ?? 0),
      image: raw.image || '',
      sku: raw.sku || raw.productCode || `GUP-${Date.now()}`,
      barcode: raw.barcode || '',
      productType: raw.productType || (raw.digitalItems?.length ? 'digital' : raw.category_slug === 'consoles' ? 'console' : 'physical'),
      platform: raw.platform || (raw.category_slug?.includes('ps5') ? 'PS5' : raw.category_slug?.includes('ps4') ? 'PS4' : 'GENERAL'),
      isTaxable: raw.isTaxable !== undefined ? !!raw.isTaxable : (raw.category_slug !== 'gift-cards'),
      requiresSerial: raw.requiresSerial !== undefined ? !!raw.requiresSerial : (raw.category_slug === 'consoles'),
      digitalItems: raw.digitalItems,
      product_variants: raw.product_variants,
      syncStatus: raw.syncStatus || 'synced',
      lastModified: raw.lastModified || Date.now()
    };
  }

  async getProducts(): Promise<Product[]> {
    let serverProducts: Product[] = [];
    let serverSuccess = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.baseUrl}/public/products`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const list = data.products || data || [];
        if (Array.isArray(list) && list.length > 0) {
          serverProducts = list.map(this.normalizeProduct);
          serverSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, reading local offline store:', err);
    }

    const cachedRaw = localStorage.getItem('cached_pos_products');
    let localProducts: Product[] = [];
    if (cachedRaw) {
      try {
        localProducts = JSON.parse(cachedRaw);
      } catch {}
    } else {
      localProducts = SEED_GAMING_PRODUCTS;
    }

    if (serverSuccess && serverProducts.length > 0) {
      // Merge: Keep any locally added/edited products that are still pending sync
      const pendingQueue = this.getPendingQueue();
      const pendingProductIds = new Set(pendingQueue.filter(q => q.type.startsWith('product_')).map(q => q.payload?.id));

      const merged = serverProducts.map(sp => {
        if (pendingProductIds.has(sp.id)) {
          const localMatch = localProducts.find(lp => lp.id === sp.id);
          return localMatch || sp;
        }
        return sp;
      });

      // Add local-only pending creations
      localProducts.forEach(lp => {
        if (lp.syncStatus === 'pending_create' && !merged.some(m => m.id === lp.id)) {
          merged.unshift(lp);
        }
      });

      localStorage.setItem('cached_pos_products', JSON.stringify(merged));
      return merged;
    }

    return localProducts.length > 0 ? localProducts : SEED_GAMING_PRODUCTS;
  }

  async saveProduct(product: Product, isNew: boolean = false): Promise<{ success: boolean; product: Product; offline: boolean }> {
    const updatedProduct: Product = {
      ...product,
      lastModified: Date.now(),
      syncStatus: navigator.onLine ? 'synced' : (isNew ? 'pending_create' : 'pending_update')
    };

    // 1. Immediately write to local products cache
    const currentList = await this.getLocalProducts();
    let nextList: Product[];
    if (isNew) {
      nextList = [updatedProduct, ...currentList.filter(p => p.id !== updatedProduct.id)];
    } else {
      nextList = currentList.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    }
    localStorage.setItem('cached_pos_products', JSON.stringify(nextList));

    // 2. If online, attempt immediate sync to server
    if (navigator.onLine) {
      try {
        const payload = {
          id: updatedProduct.id,
          name: updatedProduct.name,
          category_slug: updatedProduct.categorySlug,
          price: updatedProduct.price,
          cost: updatedProduct.cost,
          stock: updatedProduct.stock,
          image: updatedProduct.image,
          sku: updatedProduct.sku,
          barcode: updatedProduct.barcode,
          digitalItems: updatedProduct.digitalItems,
          product_variants: updatedProduct.product_variants
        };

        const res = await fetch(`${this.baseUrl}/products`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          updatedProduct.syncStatus = 'synced';
          localStorage.setItem('cached_pos_products', JSON.stringify(
            nextList.map(p => p.id === updatedProduct.id ? { ...p, syncStatus: 'synced' } : p)
          ));
          return { success: true, product: updatedProduct, offline: false };
        }
      } catch (err) {
        console.warn('Network error saving product to server, queued offline:', err);
      }
    }

    // 3. Queue offline change
    this.enqueuePendingItem({
      id: `sync_${Date.now()}_${updatedProduct.id}`,
      type: isNew ? 'product_create' : 'product_update',
      payload: updatedProduct,
      timestamp: Date.now()
    });

    return { success: true, product: updatedProduct, offline: true };
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; offline: boolean }> {
    const currentList = await this.getLocalProducts();
    const nextList = currentList.filter(p => p.id !== productId);
    localStorage.setItem('cached_pos_products', JSON.stringify(nextList));

    if (navigator.onLine) {
      try {
        const res = await fetch(`${this.baseUrl}/products/${productId}`, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
        if (res.ok) return { success: true, offline: false };
      } catch (err) {
        console.warn('Offline deleting product:', err);
      }
    }

    this.enqueuePendingItem({
      id: `sync_del_${Date.now()}_${productId}`,
      type: 'product_delete',
      payload: { id: productId },
      timestamp: Date.now()
    });

    return { success: true, offline: true };
  }

  async saveInvoice(invoice: Invoice): Promise<{ success: boolean; orderId?: string; offline: boolean }> {
    // Save to local invoices list
    const invoices = this.getLocalInvoices();
    invoices.unshift(invoice);
    localStorage.setItem('pos_invoices_history', JSON.stringify(invoices));

    if (navigator.onLine) {
      try {
        const res = await fetch(`${this.baseUrl}/pos/invoice`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            order_number: invoice.orderNumber,
            customerName: invoice.customer.name,
            customerEmail: invoice.customer.email,
            phone: invoice.customer.phone,
            total: invoice.total,
            items: invoice.items,
            date: invoice.date
          })
        });

        if (res.ok) {
          const json = await res.json();
          invoice.syncStatus = 'synced';
          localStorage.setItem('pos_invoices_history', JSON.stringify(
            invoices.map(inv => inv.id === invoice.id ? { ...inv, syncStatus: 'synced' } : inv)
          ));
          return { success: true, orderId: json.order?.id, offline: false };
        }
      } catch (err) {
        console.warn('Offline: Storing invoice in local queue for auto-sync', err);
      }
    }

    // Save offline outbox queue
    invoice.syncStatus = 'pending';
    this.enqueuePendingItem({
      id: `sync_inv_${Date.now()}_${invoice.id}`,
      type: 'invoice',
      payload: invoice,
      timestamp: Date.now()
    });

    return { success: true, orderId: `OFFLINE-${Date.now()}`, offline: true };
  }

  // Sync Queue Handling
  getPendingQueue(): PendingSyncItem[] {
    try {
      return JSON.parse(localStorage.getItem('gamesup_sync_outbox_queue') || '[]');
    } catch {
      return [];
    }
  }

  private enqueuePendingItem(item: PendingSyncItem) {
    const queue = this.getPendingQueue();
    // remove existing item for same id/product
    const filtered = queue.filter(q => !(q.type === item.type && q.payload?.id === item.payload?.id));
    filtered.push(item);
    localStorage.setItem('gamesup_sync_outbox_queue', JSON.stringify(filtered));
  }

  getPendingSyncCount(): number {
    return this.getPendingQueue().length;
  }

  async syncAllPending(): Promise<{ syncedCount: number; errors: string[] }> {
    const queue = this.getPendingQueue();
    if (queue.length === 0) return { syncedCount: 0, errors: [] };

    let syncedCount = 0;
    const remainingQueue: PendingSyncItem[] = [];
    const errors: string[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'invoice') {
          const inv: Invoice = item.payload;
          const res = await fetch(`${this.baseUrl}/pos/invoice`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              order_number: inv.orderNumber,
              customerName: inv.customer.name,
              customerEmail: inv.customer.email,
              phone: inv.customer.phone,
              total: inv.total,
              items: inv.items,
              date: inv.date
            })
          });
          if (res.ok) {
            syncedCount++;
            // Update in invoice history
            const history = this.getLocalInvoices();
            localStorage.setItem('pos_invoices_history', JSON.stringify(
              history.map(h => h.id === inv.id ? { ...h, syncStatus: 'synced' } : h)
            ));
          } else {
            remainingQueue.push(item);
            errors.push(`Invoice #${inv.orderNumber} failed: HTTP ${res.status}`);
          }
        } else if (item.type === 'product_create' || item.type === 'product_update') {
          const prod: Product = item.payload;
          const res = await fetch(`${this.baseUrl}/products`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              id: prod.id,
              name: prod.name,
              category_slug: prod.categorySlug,
              price: prod.price,
              cost: prod.cost,
              stock: prod.stock,
              image: prod.image,
              sku: prod.sku,
              barcode: prod.barcode,
              digitalItems: prod.digitalItems,
              product_variants: prod.product_variants
            })
          });
          if (res.ok) {
            syncedCount++;
            const prods = await this.getLocalProducts();
            localStorage.setItem('cached_pos_products', JSON.stringify(
              prods.map(p => p.id === prod.id ? { ...p, syncStatus: 'synced' } : p)
            ));
          } else {
            remainingQueue.push(item);
            errors.push(`Product ${prod.name} failed: HTTP ${res.status}`);
          }
        } else if (item.type === 'product_delete') {
          const res = await fetch(`${this.baseUrl}/products/${item.payload.id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
          });
          if (res.ok) {
            syncedCount++;
          } else {
            remainingQueue.push(item);
          }
        }
      } catch (err: any) {
        remainingQueue.push(item);
        errors.push(err.message || 'Network sync failure');
      }
    }

    localStorage.setItem('gamesup_sync_outbox_queue', JSON.stringify(remainingQueue));
    return { syncedCount, errors };
  }

  async getLocalProducts(): Promise<Product[]> {
    const raw = localStorage.getItem('cached_pos_products');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return SEED_GAMING_PRODUCTS;
  }

  getLocalInvoices(): Invoice[] {
    try {
      return JSON.parse(localStorage.getItem('pos_invoices_history') || '[]');
    } catch {
      return [];
    }
  }
}

export const posApi = new PosApiService();
