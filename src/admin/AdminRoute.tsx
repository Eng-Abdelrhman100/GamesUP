import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

const adminRoles = new Set(['admin', 'manager', 'staff']);

export function AdminRoute({ children }: { children: ReactNode }) {
  const savedSession = localStorage.getItem('session');
  if (!savedSession) return <>{children}</>;

  const savedUser = localStorage.getItem('user');
  if (!savedUser) {
    localStorage.removeItem('session');
    return <>{children}</>;
  }

  try {
    const parsed = JSON.parse(savedUser);
    const raw = String(parsed?.user_metadata?.role || '').trim().toLowerCase();
    const role =
      raw === 'mgr' || raw === 'managerial' || raw.startsWith('manager')
        ? 'manager'
        : raw === 'employee'
          ? 'staff'
          : raw === 'superadmin' || raw === 'super_admin' || raw === 'administrator'
            ? 'admin'
            : raw;
    if (!role) {
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      return <>{children}</>;
    }
    if (adminRoles.has(role)) return <>{children}</>;
    return <Navigate to="/" replace />;
  } catch {
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    return <>{children}</>;
  }
}
