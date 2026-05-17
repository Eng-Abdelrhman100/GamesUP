type AuthScope = 'admin' | 'customer' | 'any' | 'none';

function getApiBase() {
  return (import.meta as any).env?.VITE_API_BASE_URL || '';
}

function getStoredJson(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAccessToken(scope: AuthScope) {
  if (scope === 'none') return null;
  const admin = getStoredJson('session')?.access_token;
  const customer = getStoredJson('customerSession')?.access_token;
  if (scope === 'admin') return admin || null;
  if (scope === 'customer') return customer || null;
  return admin || customer || null;
}

function clearAuth(scope: AuthScope) {
  if (scope === 'admin' || scope === 'any') {
    localStorage.removeItem('session');
    localStorage.removeItem('user');
  }
  if (scope === 'customer' || scope === 'any') {
    localStorage.removeItem('customerSession');
  }
}

function coerceArray(data: any) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.categories)) return data.categories;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

async function requestJson<T>(path: string, options?: { method?: string; body?: any; auth?: AuthScope; headers?: Record<string, string> }): Promise<T> {
  const method = options?.method || 'GET';
  const auth = options?.auth ?? 'any';
  const token = getAccessToken(auth);

  const headers: Record<string, string> = {
    ...(options?.headers || {}),
  };

  let body: BodyInit | undefined;
  if (options?.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(options.body);
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}/api${path}`, { method, headers, body });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401 && auth !== 'none') {
      clearAuth(auth);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    const message = typeof data === 'object' && data && 'error' in data ? (data as any).error : String(data || res.statusText);
    const err: any = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

async function requestForm<T>(path: string, formData: FormData, auth: AuthScope): Promise<T> {
  const token = getAccessToken(auth);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${getApiBase()}/api${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data as T;
}

export const api = {
  get: async (table: string) => requestJson<any[]>(`/table/${table}`, { auth: 'admin' }),
  post: async (table: string, body: any) => requestJson<any>(`/table/${table}`, { method: 'POST', body, auth: 'admin' }),
  put: async (table: string, id: string | number, body: any) => requestJson<any>(`/table/${table}/${id}`, { method: 'PUT', body, auth: 'admin' }),
  patch: async (table: string, id: string | number, body: any) => requestJson<any>(`/table/${table}/${id}`, { method: 'PATCH', body, auth: 'admin' }),
  updateAll: async (table: string, updates: any, column: string, value: any) =>
    requestJson<any>(`/table/${table}/update-all`, { method: 'PUT', body: { updates, column, value }, auth: 'admin' }),
  delete: async (table: string, id: string | number) => {
    await requestJson(`/table/${table}/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    return requestJson<{ user: any }>(`/auth/register`, { method: 'POST', body: { email, password, name }, auth: 'none' });
  },
  login: async (email: string, password: string) => {
    return requestJson<{ user: any; session: any }>(`/auth/login`, { method: 'POST', body: { email, password }, auth: 'none' });
  },
  logout: async () => {},
  changePassword: async (currentPassword: string, newPassword: string) => {
    return requestJson(`/auth/change-password`, { method: 'PUT', body: { currentPassword, newPassword }, auth: 'any' });
  },
  updateProfile: async (profile: any) => {
    return requestJson<{ user: any }>(`/auth/profile`, { method: 'PUT', body: profile, auth: 'any' });
  },
  getCurrentUser: async () => {
    const data = await requestJson<{ user: any }>(`/auth/me`, { auth: 'any' });
    return data.user;
  },
};

// Products API
export const productsAPI = {
  getAll: async () => {
    return requestJson<{ products: any[] }>(`/products`, { auth: 'admin' });
  },
  getById: async (id: string | number) => {
    return requestJson<{ products: any[] }>(`/products/${id}`, { auth: 'admin' });
  },
  getPublic: async (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return requestJson<{ products: any[] }>(`/public/products${qs}`, { auth: 'none' });
  },
  getPublicById: async (id: string | number) => {
    return requestJson<{ product: any }>(`/public/products/${id}`, { auth: 'none' });
  },
  updatePublicDigitalItems: async (id: string | number, digitalItems: any) => {
    return requestJson<any>(`/public/products/${id}/digital-items`, { method: 'PUT', body: { digitalItems }, auth: 'none' });
  },
  create: async (data: any) => {
    return requestJson<any>(`/products`, { method: 'POST', body: data, auth: 'admin' });
  },
  update: async (id: string | number, data: any) => {
    return requestJson<any>(`/products/${id}`, { method: 'PUT', body: data, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/products/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
  getOverview: async (productId: string | number) => {
    return requestJson<any>(`/products/${productId}/overview`, { auth: 'admin' });
  },
};

// Orders API
export const ordersAPI = {
  getAll: async (params?: { status?: string; search?: string; email?: string; product?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.email) qs.set('email', params.email);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return requestJson<{ orders: any[] }>(`/orders${suffix}`, { auth: 'any' });
  },
  update: async (id: string | number, order: any) => {
    return requestJson<any>(`/orders/${id}`, { method: 'PUT', body: order, auth: 'admin' });
  },
  create: async (order: any) => {
     return requestJson<any>(`/orders`, { method: 'POST', body: order, auth: 'none' });
  }
};

// Customers API
export const customersAPI = {
  getAll: async () => {
    return requestJson<{ customers: any[] }>(`/customers`, { auth: 'admin' });
  },
  update: async (id: string | number, customer: any) => {
    return requestJson<any>(`/customers/${id}`, { method: 'PUT', body: customer, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/customers/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

// Tasks API
export const tasksAPI = {
  getAll: async () => {
    return requestJson<any[]>(`/tasks`, { auth: 'admin' });
  },
  create: async (task: any) => {
    return requestJson<any>(`/tasks`, { method: 'POST', body: task, auth: 'admin' });
  },
  update: async (id: string | number, task: any) => {
    return requestJson<any>(`/tasks/${id}`, { method: 'PUT', body: task, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/tasks/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

// Team API
export const teamAPI = {
  getAll: async () => {
    try {
      const data = await requestJson<any[]>(`/admin/users`, { auth: 'admin' });
      return (data || []).map((u: any) => ({
        ...u,
        avatar: u.avatar,
      }));
    } catch (err: any) {
      if (err?.status !== 404) throw err;

      const employees = await requestJson<any[]>(`/employees`, { auth: 'admin' });
      return (employees || []).map((e: any) => ({
        id: String(e.id),
        name: String(e.name || ''),
        email: String(e.email || ''),
        role: String(e.role || 'staff'),
        job_title: e.department ? String(e.department) : undefined,
        phone: e.phone ? String(e.phone) : undefined,
        avatar: e.image ? String(e.image) : undefined,
        identity_document: undefined,
        created_at: e.created_at,
      }));
    }
  },
  create: async (member: any) => {
    try {
      return await requestJson<any>(`/admin/users`, { method: 'POST', body: member, auth: 'admin' });
    } catch (err: any) {
      if (err?.status !== 404) throw err;
      const payload = {
        name: member?.name,
        email: member?.email,
        password: member?.password,
        role: member?.role,
        job_title: member?.job_title,
        department: member?.department,
        phone: member?.phone,
        avatar: member?.avatar,
        identity_document: member?.identity_document,
      };
      return await requestJson<any>(`/employees`, { method: 'POST', body: payload, auth: 'admin' });
    }
  },
  update: async (id: string | number, member: any) => {
    try {
      return await requestJson<any>(`/admin/users/${id}`, { method: 'PUT', body: member, auth: 'admin' });
    } catch (err: any) {
      if (err?.status !== 404) throw err;
      const payload = {
        name: member?.name,
        email: member?.email,
        password: member?.password,
        role: member?.role,
        job_title: member?.job_title,
        department: member?.department,
        phone: member?.phone,
        avatar: member?.avatar,
        identity_document: member?.identity_document,
      };
      return await requestJson<any>(`/employees/${id}`, { method: 'PUT', body: payload, auth: 'admin' });
    }
  },
  delete: async (id: string | number) => {
    try {
      await requestJson(`/admin/users/${id}`, { method: 'DELETE', auth: 'admin' });
      return true;
    } catch (err: any) {
      if (err?.status !== 404) throw err;
      await requestJson(`/employees/${id}`, { method: 'DELETE', auth: 'admin' });
      return true;
    }
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    return requestJson<any>(`/settings`, { auth: 'none' });
  },
  update: async (settings: any) => {
    return requestJson(`/settings`, { method: 'PUT', body: settings, auth: 'admin' });
  },
};

// Banners API
export const bannersAPI = {
  getAll: async () => {
    return requestJson<{ banners: any[] }>(`/banners`, { auth: 'none' });
  },
  create: async (banner: any) => {
    const payload = {
      ...banner,
      image_url: banner.imageUrl || banner.image_url,
      is_active: banner.isActive !== undefined ? banner.isActive : banner.is_active,
      start_date: banner.startDate || banner.start_date,
      end_date: banner.endDate || banner.end_date
    };
    delete payload.imageUrl;
    delete payload.isActive;
    delete payload.startDate;
    delete payload.endDate;

    return requestJson<any>(`/banners`, { method: 'POST', body: payload, auth: 'admin' });
  },
  update: async (id: string | number, banner: any) => {
    const payload = {
      ...banner,
      image_url: banner.imageUrl || banner.image_url,
      is_active: banner.isActive !== undefined ? banner.isActive : banner.is_active,
      start_date: banner.startDate || banner.start_date,
      end_date: banner.endDate || banner.end_date
    };
    delete payload.imageUrl;
    delete payload.isActive;
    delete payload.startDate;
    delete payload.endDate;
    delete payload.id;

    return requestJson<any>(`/banners/${id}`, { method: 'PUT', body: payload, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/banners/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    const data = await requestJson<any>(`/categories`, { auth: 'none' });
    return coerceArray(data);
  },
  getFooterTop: async (limit = 5) => {
    const data = await requestJson<any>(`/categories/footer-top?limit=${limit}`, { auth: 'none' });
    return coerceArray(data);
  },
  create: async (category: any) => {
    return requestJson<any>(`/categories`, { method: 'POST', body: category, auth: 'admin' });
  },
  update: async (id: string | number, category: any) => {
    return requestJson<any>(`/categories/${id}`, { method: 'PUT', body: category, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/categories/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async () => {
    return requestJson<{ expenses: any[] }>(`/expenses`, { auth: 'admin' });
  },
  create: async (expense: any) => {
    return requestJson<any>(`/expenses`, { method: 'POST', body: expense, auth: 'admin' });
  },
  update: async (id: string | number, expense: any) => {
    return requestJson<any>(`/expenses/${id}`, { method: 'PUT', body: expense, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/expenses/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
};

// HR API
export const hrAPI = {
  getAttendance: async (date: string) => {
    return requestJson<any[]>(`/attendance?date=${encodeURIComponent(date)}`, { auth: 'admin' });
  },
  getEmployees: async () => {
    return requestJson<any[]>(`/employees`, { auth: 'admin' });
  },
  markAttendance: async (attendance: any) => {
    return requestJson<any>(`/attendance`, { method: 'POST', body: attendance, auth: 'admin' });
  },
  updateAttendance: async (id: string | number, attendance: any) => {
    return requestJson<any>(`/attendance/${id}`, { method: 'PUT', body: attendance, auth: 'admin' });
  },
};

// POS API
export const posAPI = {
  createInvoice: async (invoice: any) => {
    return requestJson<any>(`/pos/invoice`, { method: 'POST', body: invoice, auth: 'admin' });
  },
  getInvoices: async () => {
    return requestJson<any[]>(`/pos/invoices`, { auth: 'admin' });
  },
};

// Init API - No longer needed for Supabase
export const initAPI = {
  initialize: async () => { return { success: true }; },
};

// Roles API
export const rolesAPI = {
  getAll: async () => {
    return requestJson<{ roles: any[] }>(`/roles`, { auth: 'admin' });
  },
  create: async (role: any) => {
    return requestJson<any>(`/roles`, { method: 'POST', body: role, auth: 'admin' });
  },
  update: async (id: string | number, role: any) => {
    return requestJson<any>(`/roles/${id}`, { method: 'PUT', body: role, auth: 'admin' });
  },
  delete: async (id: string | number) => {
    await requestJson(`/roles/${id}`, { method: 'DELETE', auth: 'admin' });
    return true;
  },
  createAdminUser: async (user: any) => {
    return requestJson<any>(`/admin/users`, { method: 'POST', body: user, auth: 'admin' });
  }
};

// Admin API
export const adminAPI = {
  getSoldProducts: async () => {
    return requestJson<any[]>(`/admin/sold-products`, { auth: 'admin' });
  },
  getAnalytics: async (timeRange: string = '12months') => {
    return requestJson<any>(`/admin/analytics?timeRange=${encodeURIComponent(timeRange)}`, { auth: 'admin' });
  },
  getDashboard: async (params?: { timeRange?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.timeRange) qs.set('timeRange', params.timeRange);
    if (params?.category) qs.set('category', params.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return requestJson<any>(`/admin/dashboard${suffix}`, { auth: 'admin' });
  },
};

// File Upload API
export const uploadAPI = {
  uploadImage: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return requestForm<{ url: string }>(`/uploads/products`, fd, 'admin');
  },
  uploadChatImage: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return requestForm<{ url: string }>(`/uploads/chat-images`, fd, 'customer');
  },
  uploadPaymentProof: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return requestForm<{ url: string }>(`/uploads/payment-proofs`, fd, 'none');
  },
};

export const deliveryOptionsAPI = {
  getAll: async () => requestJson<any[]>(`/delivery-options`, { auth: 'none' }),
  create: async (data: any) => requestJson<any>(`/delivery-options`, { method: 'POST', body: data, auth: 'admin' }),
  update: async (id: string | number, data: any) => requestJson<any>(`/delivery-options/${id}`, { method: 'PUT', body: data, auth: 'admin' }),
  delete: async (id: string | number) => requestJson(`/delivery-options/${id}`, { method: 'DELETE', auth: 'admin' }),
};

export const emailTemplatesAPI = {
  getAll: async () => requestJson<any[]>(`/email-templates`, { auth: 'admin' }),
  getByType: async (type: string) => requestJson<any>(`/email-templates?type=${encodeURIComponent(type)}`, { auth: 'none' }),
  create: async (data: any) => requestJson<any>(`/email-templates`, { method: 'POST', body: data, auth: 'admin' }),
  update: async (id: string | number, data: any) => requestJson<any>(`/email-templates/${id}`, { method: 'PUT', body: data, auth: 'admin' }),
  delete: async (id: string | number) => requestJson(`/email-templates/${id}`, { method: 'DELETE', auth: 'admin' }),
};

export const orderChatsAPI = {
  getByOrderId: async (orderId: string | number) => requestJson<any[]>(`/order-chats?orderId=${orderId}`, { auth: 'any' }),
  getAll: async () => requestJson<any[]>(`/admin/order-chats`, { auth: 'admin' }),
  sendMessage: async (order_id: string | number, content: string) =>
    requestJson<any>(`/order-chats`, { method: 'POST', body: { order_id, content }, auth: 'any' }),
};

export const chatAPI = {
  getMessages: async () => requestJson<any[]>(`/chat/messages`, { auth: 'customer' }),
  sendMessage: async (content: string, image_url?: string) =>
    requestJson<any>(`/chat/messages`, { method: 'POST', body: { content, image_url }, auth: 'customer' }),
  markRead: async (ids: string[]) => requestJson<any>(`/chat/messages/mark-read`, { method: 'PUT', body: { ids }, auth: 'customer' }),
};
