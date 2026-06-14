import { useState, useEffect } from 'react';
import { Search, Eye, Download, FileText, Printer, X, Plus, Mail } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { ordersAPI, api, productsAPI } from '../../utils/api';
import { emailService } from '../../utils/emailService';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { QuickEditCell } from '../../components/ui/QuickEditCell';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  date: string;
  status: string;
  amount: number;
  digital_email?: string;
  digital_password?: string;
  digital_code?: string;
  inventory_id?: string;
  payment_method?: string;
  payment_proof?: string;
  created_at?: string;
  shipping_address?: any;
  digital_delivery?: string;
  cost?: number;
}

interface ProductListItem {
  id: string | number;
  name: string;
  price?: number;
}

export function Orders() {
  const { settings, formatPrice } = useStoreSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const getDigitalDetails = (order: Order) => {
    let email = order.digital_email || '';
    let password = order.digital_password || '';
    let code = order.digital_code || '';
    let slotName = '';

    try {
      if (order.digital_delivery) {
        const parsed = typeof order.digital_delivery === 'string'
          ? JSON.parse(order.digital_delivery)
          : order.digital_delivery;
        const items = Array.isArray(parsed) ? parsed : [];
        if (items.length > 0) {
          const item = items[0];
          if (item) {
            if (!email) email = item.email || '';
            if (!password) password = item.password || '';
            
            const productNameLower = (order.product_name || '').toLowerCase();
            let selectedSlotName = '';
            if (productNameLower.includes('primary ps5')) selectedSlotName = 'Primary PS5';
            else if (productNameLower.includes('primary ps4')) selectedSlotName = 'Primary PS4';
            else if (productNameLower.includes('secondary')) selectedSlotName = 'Secondary';
            else if (productNameLower.includes('offline ps5')) selectedSlotName = 'Offline PS5';
            else if (productNameLower.includes('offline ps4')) selectedSlotName = 'Offline PS4';

            if (item.slots && selectedSlotName) {
              const keys = Object.keys(item.slots);
              const matchedKey = keys.find(k => k.toLowerCase() === selectedSlotName.toLowerCase()) || '';
              if (matchedKey) {
                slotName = matchedKey;
                if (!code) code = item.slots[matchedKey]?.code || '';
              }
            }
            if (!code && item.code) {
              code = item.code;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error parsing digital delivery details', e);
    }
    return { email, password, code, slotName };
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [productsList, setProductsList] = useState<ProductListItem[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [creatingManualOrder, setCreatingManualOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState(() => ({
    productMode: 'existing' as 'existing' | 'custom',
    productId: '',
    productName: '',
    amount: '',
    customerName: '',
    customerEmail: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    paymentMethod: 'cash',
    cost: '',
    digitalEmail: '',
    digitalPassword: '',
    digitalCode: '',
    inventoryId: ''
  }));

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProductsList(
        (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price
        }))
      );
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [searchQuery, statusFilter, productFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchQuery
      };
      
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      
      if (productFilter !== 'All') {
        params.product = productFilter;
      }

      const data = await ordersAPI.getAll(params);
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
      // Fallback or empty state handled by default empty array
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      // Optimistic update
      setOrders(orders.map(o => o.id === id ? { ...o, ...updates } : o));
      
      await ordersAPI.update(id, updates);
    } catch (err) {
      console.error('Failed to update order:', err);
      // Revert on error
      loadOrders();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // Perform database update and capture the updated order record returned
      const updatedOrder = await ordersAPI.update(id, { status: newStatus });
      
      setOrders(orders.map((o) => (o.id === id ? { ...o, ...updatedOrder, status: newStatus } : o)));
      
      // If status changed to 'completed', send digital delivery email
      if (newStatus === 'completed' && updatedOrder) {
        let digitalItems: any[] = [];
        try {
          if (updatedOrder.digital_delivery) {
            digitalItems = typeof updatedOrder.digital_delivery === 'string'
              ? JSON.parse(updatedOrder.digital_delivery)
              : updatedOrder.digital_delivery;
          } else if (updatedOrder.digital_code || updatedOrder.digital_email || updatedOrder.digital_password) {
            // Fallback for old orders or manually edited fields
            digitalItems = [{
              name: updatedOrder.product_name,
              code: updatedOrder.digital_code,
              email: updatedOrder.digital_email,
              password: updatedOrder.digital_password
            }];
          }
          
          if (digitalItems.length > 0) {
            const res = await emailService.sendDigitalDelivery(updatedOrder, digitalItems);
            if (res?.success) {
              alert('Digital delivery email sent successfully with order details and slot data!');
            } else {
              alert('Failed to send digital delivery email: ' + (res?.error || 'Unknown error'));
            }
          } else {
            // No digital items found on the order
            const res = await emailService.sendEmail(updatedOrder.customer_email, 'status_update', {
              name: updatedOrder.customer_name,
              orderId: updatedOrder.order_number || updatedOrder.id,
              status: newStatus.toUpperCase(),
              total: updatedOrder.amount,
              date: new Date().toLocaleDateString()
            });
            if (res?.success) {
               alert('Order marked as completed, but no digital credentials were found on this order. A generic order completion email was sent instead.');
            } else {
               alert('Order marked as completed, but failed to send completion email.');
            }
          }
        } catch (parseError: any) {
          console.error('Error parsing digital items for email:', parseError);
          alert('Error processing digital delivery: ' + parseError.message);
        }
      } else if (newStatus !== 'pending' && updatedOrder) {
        // Send a generic status update for shipped, processing, cancelled
        const res = await emailService.sendEmail(updatedOrder.customer_email, 'status_update', {
           name: updatedOrder.customer_name,
           orderId: updatedOrder.order_number || updatedOrder.id,
           status: newStatus.toUpperCase(),
           total: updatedOrder.amount,
           date: new Date().toLocaleDateString()
        });
        if (res?.success) {
           alert(`Status update email (${newStatus}) sent to customer.`);
        }
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status: ' + err.message);
    }
  };

  const handleViewProof = async (id: string, url: string) => {
    setViewingProof(url);
  };

  const handleResendEmail = async (orderToEmail: Order) => {
    if (!confirm(`Are you sure you want to resend the digital delivery email to ${orderToEmail.customer_email}?`)) return;
    try {
      let digitalItems: any[] = [];
      if (orderToEmail.digital_delivery) {
        digitalItems = typeof orderToEmail.digital_delivery === 'string'
          ? JSON.parse(orderToEmail.digital_delivery)
          : orderToEmail.digital_delivery;
      } else if (orderToEmail.digital_code || orderToEmail.digital_email || orderToEmail.digital_password) {
        digitalItems = [{
          name: orderToEmail.product_name,
          code: orderToEmail.digital_code,
          email: orderToEmail.digital_email,
          password: orderToEmail.digital_password
        }];
      }
      
      if (digitalItems.length > 0) {
        const res = await emailService.sendDigitalDelivery(orderToEmail, digitalItems);
        if (res?.success) alert('Digital delivery email sent successfully!');
        else alert('Failed to send email: ' + (res?.error || 'Unknown error'));
      } else {
        alert('No digital items found for this order. Email cannot be sent.');
      }
    } catch (err) {
      console.error('Error sending email manually:', err);
      alert('Failed to send email.');
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    if (!element || !selectedOrder) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Force light mode for PDF generation
          clonedDoc.documentElement.classList.remove('dark');
          const clonedElement = clonedDoc.getElementById('invoice-content');
          if (clonedElement) {
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#111827';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${selectedOrder.order_number || (selectedOrder as any).orderNumber || selectedOrder.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const openManualOrder = () => {
    setManualOrder({
      productMode: 'existing',
      productId: '',
      productName: '',
      amount: '',
      customerName: '',
      customerEmail: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      paymentMethod: 'cash',
      cost: '',
      digitalEmail: '',
      digitalPassword: '',
      digitalCode: '',
      inventoryId: ''
    });
    setShowManualOrder(true);
  };

  const createManualOrder = async () => {
    try {
      const productName =
        manualOrder.productMode === 'existing'
          ? (productsList.find((p) => String(p.id) === manualOrder.productId)?.name || manualOrder.productName).trim()
          : manualOrder.productName.trim();

      const amountNumber = Number(manualOrder.amount);

      if (!manualOrder.customerName.trim()) {
        alert('Customer name is required.');
        return;
      }
      if (!manualOrder.customerEmail.trim()) {
        alert('Customer email is required.');
        return;
      }
      if (!productName) {
        alert('Product name is required.');
        return;
      }
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        alert('Amount must be a valid number greater than 0.');
        return;
      }

      setCreatingManualOrder(true);

      const orderNumber = `MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const orderData: any = {
        order_number: orderNumber,
        customer_name: manualOrder.customerName.trim(),
        customer_email: manualOrder.customerEmail.trim(),
        product_name: productName,
        date: manualOrder.date,
        status: manualOrder.status,
        amount: amountNumber,
        payment_method: manualOrder.paymentMethod,
        cost: Number(manualOrder.cost) || 0,
        digital_email: manualOrder.digitalEmail || '',
        digital_password: manualOrder.digitalPassword || '',
        digital_code: manualOrder.digitalCode || '',
        inventory_id: manualOrder.inventoryId || ''
      };

      await ordersAPI.create(orderData);
      setShowManualOrder(false);
      await loadOrders();
    } catch (err: any) {
      console.error('Failed to create manual order:', err);
      alert(err?.message || 'Failed to create manual order');
    } finally {
      setCreatingManualOrder(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800';
      case 'pending_approval':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'shipped':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track all orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openManualOrder}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/30"
          >
            <Plus className="w-4 h-4" />
            Manual Order
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{orders.length}</p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {orders.filter((o) => o.status === 'pending').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Processing</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {orders.filter((o) => o.status === 'processing').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {orders.filter((o) => o.status === 'completed').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {orders.filter((o) => o.status === 'cancelled').length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders or customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Products</option>
            {productsList.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="p-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Digital Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Digital Password</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Digital Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Inventory ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Proof</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Cost</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const { email: displayEmail, password: displayPassword, code: displayCode, slotName } = getDigitalDetails(order);

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{order.order_number || order.id}</td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <p>{order.product_name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-gray-400 dark:text-gray-500">1 item(s)</span>
                            {slotName && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                {slotName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                        <QuickEditCell
                          value={displayEmail}
                          onSave={(val) => updateOrder(order.id, { digital_email: String(val) })}
                          className="truncate block"
                        />
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                        <QuickEditCell
                          value={displayPassword}
                          onSave={(val) => updateOrder(order.id, { digital_password: String(val) })}
                          className="truncate block"
                        />
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                        <QuickEditCell
                          value={displayCode}
                          onSave={(val) => updateOrder(order.id, { digital_code: String(val) })}
                          className="truncate block"
                        />
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-gray-500 dark:text-gray-400">{order.inventory_id || '-'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                        {order.payment_method ? (
                          <span className="capitalize">{order.payment_method.replace('_', ' ')}</span>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                        {order.payment_proof ? (
                          <button 
                            onClick={() => setViewingProof(order.payment_proof!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(order.date || order.created_at || '').toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${getStatusColor(order.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="pending_approval">Pending Approval</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 italic">
                        {order.cost != null ? formatPrice(order.cost) : '-'}
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{formatPrice(order.amount)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewInvoice(order)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewInvoice(order)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResendEmail(order)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Resend Digital Delivery Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Order Modal */}
      <AnimatePresence>
        {showManualOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Manual Order</h3>
                <button
                  onClick={() => setShowManualOrder(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name</label>
                    <input
                      value={manualOrder.customerName}
                      onChange={(e) => setManualOrder({ ...manualOrder, customerName: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Email</label>
                    <input
                      value={manualOrder.customerEmail}
                      onChange={(e) => setManualOrder({ ...manualOrder, customerEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Date</label>
                    <input
                      type="date"
                      value={manualOrder.date}
                      onChange={(e) => setManualOrder({ ...manualOrder, date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                      value={manualOrder.status}
                      onChange={(e) => setManualOrder({ ...manualOrder, status: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                    <select
                      value={manualOrder.paymentMethod}
                      onChange={(e) => setManualOrder({ ...manualOrder, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="instapay">InstaPay</option>
                      <option value="vodafone_cash">Vodafone Cash</option>
                      <option value="telda">Telda</option>
                      <option value="binance">Binance Pay</option>
                      <option value="paypal">PayPal Manual</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setManualOrder({ ...manualOrder, productMode: 'existing', productId: '' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        manualOrder.productMode === 'existing'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      Existing Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualOrder({ ...manualOrder, productMode: 'custom', productId: '' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        manualOrder.productMode === 'custom'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      Custom Product
                    </button>
                  </div>

                  {manualOrder.productMode === 'existing' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product</label>
                        <select
                          value={manualOrder.productId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const product = productsList.find((p) => String(p.id) === selectedId);
                            setManualOrder({
                              ...manualOrder,
                              productId: selectedId,
                              productName: product?.name || '',
                              amount: product?.price != null ? String(product.price) : manualOrder.amount
                            });
                          }}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select a product…</option>
                          {productsList.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                        <input
                          type="number"
                          value={manualOrder.amount}
                          onChange={(e) => setManualOrder({ ...manualOrder, amount: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name</label>
                        <input
                          value={manualOrder.productName}
                          onChange={(e) => setManualOrder({ ...manualOrder, productName: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                        <input
                          type="number"
                          value={manualOrder.amount}
                          onChange={(e) => setManualOrder({ ...manualOrder, amount: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inventory ID (optional)</label>
                    <input
                      value={manualOrder.inventoryId}
                      onChange={(e) => setManualOrder({ ...manualOrder, inventoryId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost (Purchase Price)</label>
                    <input
                      type="number"
                      value={manualOrder.cost}
                      onChange={(e) => setManualOrder({ ...manualOrder, cost: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Digital Email (optional)</label>
                    <input
                      value={manualOrder.digitalEmail}
                      onChange={(e) => setManualOrder({ ...manualOrder, digitalEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Digital Password (optional)</label>
                    <input
                      value={manualOrder.digitalPassword}
                      onChange={(e) => setManualOrder({ ...manualOrder, digitalPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Digital Code (optional)</label>
                    <input
                      value={manualOrder.digitalCode}
                      onChange={(e) => setManualOrder({ ...manualOrder, digitalCode: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowManualOrder(false)}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={creatingManualOrder}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createManualOrder}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={creatingManualOrder}
                  >
                    {creatingManualOrder ? 'Creating…' : 'Create Order'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Proof Modal */}
      <AnimatePresence>
        {viewingProof && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Payment Proof</h3>
                <button 
                  onClick={() => setViewingProof(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] flex justify-center bg-gray-100">
                <img 
                  src={viewingProof} 
                  alt="Payment Proof" 
                  className="max-w-full h-auto rounded-lg shadow-md" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoice && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-black"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 print:hidden">
                  <h2 className="text-2xl font-bold text-gray-900">Invoice Generated</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handlePrintInvoice}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Print Invoice"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowInvoice(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6" id="invoice-content" style={{
                  // Override Tailwind variables with Hex values for html2canvas compatibility
                  ['--color-gray-50' as any]: '#f9fafb',
                  ['--color-gray-100' as any]: '#f3f4f6',
                  ['--color-gray-200' as any]: '#e5e7eb',
                  ['--color-gray-300' as any]: '#d1d5db',
                  ['--color-gray-400' as any]: '#9ca3af',
                  ['--color-gray-500' as any]: '#6b7280',
                  ['--color-gray-600' as any]: '#4b5563',
                  ['--color-gray-700' as any]: '#374151',
                  ['--color-gray-800' as any]: '#1f2937',
                  ['--color-gray-900' as any]: '#111827',
                  ['--color-red-600' as any]: '#dc2626',
                  backgroundColor: '#ffffff', // Ensure white background for PDF
                  color: '#111827', // Default text color
                } as React.CSSProperties}>
                  <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Games Up</h3>
                      <p className="text-gray-500">123 Gaming Street</p>
                      <p className="text-gray-500">Tech City, TC 90210</p>
                      <p className="text-gray-500">contact@games-up.co</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">Invoice #{selectedOrder.order_number || selectedOrder.id}</p>
                      <p className="text-gray-500">{selectedOrder.date || selectedOrder.created_at?.split('T')[0]}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 border-b border-gray-200 pb-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Bill To:</h4>
                      <p className="text-gray-600">{selectedOrder.customer_name}</p>
                      <p className="text-gray-600">{selectedOrder.customer_email}</p>
                    </div>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-semibold text-gray-900">Item</th>
                        <th className="text-center py-2 text-sm font-semibold text-gray-900">Qty</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-900">Price</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-3 text-sm text-gray-600">
                            <div>{selectedOrder.product_name}</div>
                          </td>
                          <td className="py-3 text-center text-sm text-gray-600">1</td>
                          <td className="py-3 text-right text-sm text-gray-600">{formatPrice(selectedOrder.amount)}</td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900">
                            {formatPrice(selectedOrder.amount)}
                          </td>
                        </tr>
                    </tbody>
                  </table>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatPrice(selectedOrder.amount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-red-600">{formatPrice(selectedOrder.amount)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:hidden">
                   <p>Thank you for your business!</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Order ID</h3>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedOrder.order_number || selectedOrder.id}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Date</h3>
                      <p className="text-gray-900 dark:text-white">{selectedOrder.date || selectedOrder.created_at?.split('T')[0]}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Amount</h3>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatPrice(selectedOrder.amount)}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                        <p className="text-gray-900 dark:text-white">{selectedOrder.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <p className="text-gray-900 dark:text-white">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cost Info */}
                  {selectedOrder.cost != null && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="p-1 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400">
                          <Download className="w-4 h-4" />
                        </span>
                        Cost Information
                      </h3>
                      <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800 flex justify-between items-center">
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Purchase Cost / Expense</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPrice(selectedOrder.cost)}</p>
                      </div>
                    </div>
                  )}

                  {/* Checkout Note / Instructions */}
                  {selectedOrder.shipping_address && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Checkout Note / Address</h3>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                          {String(selectedOrder.shipping_address)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Details</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.product_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">1 item(s)</p>
                    </div>
                  </div>

                  {/* Digital Delivery Info - The requested feature */}
                  {(() => {
                    const modalDetails = getDigitalDetails(selectedOrder);
                    return (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                            <FileText className="w-4 h-4" />
                          </span>
                          Digital Delivery {modalDetails.slotName ? `(${modalDetails.slotName})` : ''}
                        </h3>
                        <div className="grid grid-cols-1 gap-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                              Digital Email
                            </label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={modalDetails.email || ''} 
                                readOnly 
                                className="flex-1 bg-white dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-gray-900 dark:text-white shadow-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                Password
                              </label>
                              <input 
                                type="text" 
                                value={modalDetails.password || ''} 
                                readOnly 
                                className="w-full bg-white dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-gray-900 dark:text-white shadow-sm font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                License Code
                              </label>
                              <input 
                                type="text" 
                                value={modalDetails.code || ''} 
                                readOnly 
                                className="w-full bg-white dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-gray-900 dark:text-white shadow-sm font-mono tracking-widest"
                              />
                            </div>
                          </div>

                          {selectedOrder.inventory_id && (
                            <div className="pt-2 border-t border-blue-200 dark:border-blue-800/50 mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Linked Inventory ID: <span className="font-mono text-gray-700 dark:text-gray-300">{selectedOrder.inventory_id}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                          * These credentials are provided to the customer upon order completion.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setShowInvoice(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Invoice
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {viewingProof && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingProof(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Proof</h3>
                <button
                  onClick={() => setViewingProof(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <img 
                  src={viewingProof} 
                  alt="Payment Proof" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                 <button
                    onClick={() => window.open(viewingProof, '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Open Original
                  </button>
                  <button
                    onClick={() => setViewingProof(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
