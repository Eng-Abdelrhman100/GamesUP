import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { psPlusAPI } from '@/utils/api';
import {
  Search, Plus, Eye, EyeOff, Copy, Check, Trash2, RefreshCw, Upload, X,
  Gamepad2, ShieldCheck, KeyRound, FileKey, ChevronDown, ChevronUp, Ban, Lock
} from 'lucide-react';

const BACKUP_CODE_COUNT = 12;

interface AccountRow {
  id: string | number;
  email: string;
  status: string;
  license_id: string | number | null;
  license_code?: string | null;
  license_status?: string | null;
  backup_total: number;
  backup_available: number;
  backup_used: number;
  created_at?: string;
}

interface BackupCode {
  id: string | number;
  code: string;
  status: string;
  used_at?: string | null;
  created_at?: string;
}

interface LicenseRow {
  id: string | number;
  license_code: string;
  status: string;
  account_id?: string | number | null;
  assigned_at?: string | null;
  created_at?: string;
}

const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  RESERVED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  SOLD: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  DISABLED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  EXPIRED: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
};

const backupStatusColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  USED: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  INVALID: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

type InventoryType = 'ACCOUNT_ONLY' | 'ACCOUNT_WITH_LICENSE' | 'LICENSE_ONLY';

interface FormState {
  email: string;
  password: string;
  licenseCode: string;
  backupCodes: string[]; // length 12
}

const emptyForm = (): FormState => ({ email: '', password: '', licenseCode: '', backupCodes: Array(12).fill('') });

export function PsPlusInventory() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<InventoryType>('ACCOUNT_ONLY');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [addErrors, setAddErrors] = useState<any[]>([]);

  // Detail modal state
  const [detail, setDetail] = useState<any>(null);
  const [detailAccountId, setDetailAccountId] = useState<string | number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<LicenseRow[]>([]);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [markSoldOrder, setMarkSoldOrder] = useState('');
  const [showSoldBox, setShowSoldBox] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkReport, setBulkReport] = useState<any>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await psPlusAPI.getStats();
      setStats(res?.stats || null);
    } catch { /* stats optional */ }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await psPlusAPI.getAccounts({ search: search || undefined, status: statusFilter || undefined });
      setAccounts(res?.accounts || []);
    } catch (err: any) {
      console.error('Failed to load PS+ accounts', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounce stats refresh after mutations
  const refreshAll = useCallback(async () => {
    await Promise.all([loadAccounts(), loadStats()]);
  }, [loadAccounts, loadStats]);

  const openDetail = async (accountId: string | number) => {
    setDetailAccountId(accountId);
    setDetail(null);
    setRevealedPassword(null);
    setAuditItems([]);
    setAvailableLicenses([]);
    setShowAssignPicker(false);
    setShowSoldBox(false);
    setDetailLoading(true);
    try {
      const res = await psPlusAPI.getAccount(accountId);
      setDetail(res || null);
      try {
        const auditRes = await psPlusAPI.getAudit({ entityType: 'ps_plus_account', entityId: accountId });
        setAuditItems(auditRes?.items || []);
      } catch { /* audit optional */ }
      try {
        const licRes = await psPlusAPI.getLicenses({ status: 'AVAILABLE' });
        setAvailableLicenses(licRes?.licenses || []);
      } catch { /* licenses optional */ }
    } catch (err: any) {
      console.error('Failed to load account detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRevealPassword = async () => {
    if (!detailAccountId) return;
    if (revealedPassword) {
      setRevealedPassword(null);
      return;
    }
    try {
      const res = await psPlusAPI.revealPassword(detailAccountId);
      setRevealedPassword(res?.password || '');
    } catch (err: any) {
      alert(err?.message || 'Failed to reveal password');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch { /* clipboard unavailable */ }
  };

  const addFormBackupCount = () => form.backupCodes.filter((c) => String(c).trim() !== '').length;

  const handleAddSubmit = async () => {
    setSubmitting(true);
    setAddErrors([]);
    try {
      if (addType === 'LICENSE_ONLY') {
        const codes = form.licenseCode.split('\n').map((s) => s.trim()).filter(Boolean);
        await psPlusAPI.createInventory({ type: 'LICENSE_ONLY', licenseCodes: codes });
      } else {
        const backupCodes = form.backupCodes.filter((c) => String(c).trim() !== '');
        const payload: any = {
          type: addType,
          account: { email: form.email, password: form.password },
          backupCodes,
        };
        if (addType === 'ACCOUNT_WITH_LICENSE') payload.licenseCode = form.licenseCode.trim();
        await psPlusAPI.createInventory(payload);
      }
      setShowAdd(false);
      setForm(emptyForm());
      setAddType('ACCOUNT_ONLY');
      await refreshAll();
    } catch (err: any) {
      const errors = err?.errors || [{ message: err?.message || 'Failed to create' }];
      setAddErrors(Array.isArray(errors) ? errors : [errors]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkBackupUsed = async (code: BackupCode) => {
    if (!confirm(`Mark backup code ${code.code} as USED?`)) return;
    try {
      await psPlusAPI.markBackupUsed(code.id);
      if (detailAccountId) await openDetail(detailAccountId);
    } catch (err: any) {
      alert(err?.message || 'Failed');
    }
  };

  const handleReplaceBackup = async (code: BackupCode) => {
    const newCode = prompt('Enter the replacement backup code:');
    if (!newCode || !newCode.trim()) return;
    try {
      await psPlusAPI.replaceBackup(code.id, newCode.trim());
      if (detailAccountId) await openDetail(detailAccountId);
    } catch (err: any) {
      alert(err?.message || 'Failed to replace code');
    }
  };

  const handleAssignLicense = async (licenseId: string | number) => {
    if (!detailAccountId) return;
    try {
      await psPlusAPI.assignLicense(licenseId, detailAccountId);
      setShowAssignPicker(false);
      await openDetail(detailAccountId);
    } catch (err: any) {
      alert(err?.message || 'Failed to assign license');
    }
  };

  const handleRemoveLicense = async () => {
    const lic = detail?.license;
    if (!lic) return;
    if (!confirm('Remove this license from the account?')) return;
    try {
      await psPlusAPI.removeLicense(lic.id);
      await openDetail(detailAccountId!);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove license');
    }
  };

  const handleMarkSold = async () => {
    if (!detailAccountId) return;
    if (!confirm(`Mark account as SOLD${markSoldOrder ? ` against order #${markSoldOrder}` : ''}? This cannot be undone.`)) return;
    try {
      await psPlusAPI.markSold(detailAccountId, markSoldOrder || undefined);
      setShowSoldBox(false);
      setMarkSoldOrder('');
      await openDetail(detailAccountId);
      await refreshAll();
    } catch (err: any) {
      alert(err?.message || 'Failed to mark as sold');
    }
  };

  const handleDeleteAccount = async (account: AccountRow) => {
    if (!confirm(`Delete account ${account.email}? Its backup codes will be removed (blocked if SOLD).`)) return;
    try {
      await psPlusAPI.deleteAccount(account.id);
      if (String(detailAccountId) === String(account.id)) setDetail(null);
      await refreshAll();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete account');
    }
  };

  // ---- Bulk import ----
  const parseCsvRows = (): any[] => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: any[] = [];
    for (const line of lines) {
      // Support simple comma CSV (values with commas are not expected for these fields)
      const parts = line.split(',').map((p) => p.trim());
      const email = parts[0] || '';
      const password = parts[1] || '';
      const row: any = { email, password };
      for (let c = 1; c <= BACKUP_CODE_COUNT; c++) {
        row[`backupCode${String(c).padStart(2, '0')}`] = parts[1 + c] || '';
      }
      row.licenseCode = parts[2 + BACKUP_CODE_COUNT] || '';
      rows.push(row);
    }
    return rows;
  };

  const handleBulkSubmit = async () => {
    setBulkSubmitting(true);
    setBulkError(null);
    setBulkReport(null);
    try {
      const rows = parseCsvRows();
      if (!rows.length) {
        setBulkError('No rows found. Paste at least one CSV line.');
        return;
      }
      const res = await psPlusAPI.importRows(rows);
      setBulkReport(res?.report || null);
      if (res?.success) {
        await refreshAll();
      }
    } catch (err: any) {
      const report = err?.report;
      if (report) {
        setBulkReport(report);
      } else {
        setBulkError(err?.message || 'Import failed');
      }
    } finally {
      setBulkSubmitting(false);
    }
  };

  const addFormInvalid = addType === 'LICENSE_ONLY'
    ? form.licenseCode.trim() === ''
    : (form.email.trim() === '' || form.password === '' || addFormBackupCount() !== BACKUP_CODE_COUNT);

  const statCards = [
    { label: 'Accounts Available', value: stats?.accounts?.available ?? '—', icon: Gamepad2, color: 'text-emerald-500' },
    { label: 'Accounts Sold', value: stats?.accounts?.sold ?? '—', icon: ShieldCheck, color: 'text-gray-500' },
    { label: 'Licenses Available', value: stats?.licenses?.available ?? '—', icon: FileKey, color: 'text-blue-500' },
    { label: 'Backup Codes Available', value: stats ? `${stats.backupCodes.available} / ${stats.backupCodes.total}` : '—', icon: KeyRound, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PS Plus Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accounts, credentials & license management (admin only)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setShowBulk(true); setBulkText(''); setBulkReport(null); setBulkError(null); }} className="text-xs">
            <Upload className="w-4 h-4 mr-1.5" /> Bulk Import
          </Button>
          <Button onClick={() => { setShowAdd(true); setForm(emptyForm()); setAddErrors([]); }} className="bg-brand-red text-white text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Add New PS Plus Inventory
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{s.value}</p>
              </div>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Search + filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by account email..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
            <option value="DISABLED">Disabled</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <Button variant="outline" onClick={() => refreshAll()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Inventory table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-800/80 font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">Account</th>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">Email</th>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">License</th>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 text-center">Backup Codes</th>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">Status</th>
                <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Loading accounts...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No PS+ accounts found. Add one or bulk import to get started.</td></tr>
              ) : accounts.map((acc) => (
                <tr key={acc.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer" onClick={() => openDetail(acc.id)}>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800 font-bold text-gray-900 dark:text-white">ACC-{acc.id}</td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200">{acc.email}</td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800">
                    {acc.license_code ? (
                      <span className="font-mono text-[10px]">{acc.license_code}</span>
                    ) : (
                      <span className="text-gray-400 italic">No license</span>
                    )}
                    <div className="text-[10px] text-gray-400 capitalize">{acc.license_status?.toLowerCase() || ''}</div>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(acc.backup_available || 0) > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {acc.backup_available || 0} / {acc.backup_total || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[acc.status] || 'bg-gray-100 text-gray-600'}`}>{acc.status}</span>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openDetail(acc.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                      <button
                        onClick={() => { if (confirm(`Delete account ${acc.email}?`)) handleDeleteAccount(acc); }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Delete"
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------------- Add Inventory Modal ---------------- */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New PS Plus Inventory">
        <div className="space-y-4">
          {/* Type picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">Product Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ACCOUNT_ONLY', 'ACCOUNT_WITH_LICENSE', 'LICENSE_ONLY'] as InventoryType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddType(t)}
                  className={`px-3 py-3 rounded-xl border text-xs font-bold transition-colors ${
                    addType === t
                      ? 'border-brand-red bg-brand-red/10 text-brand-red'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {t === 'ACCOUNT_ONLY' ? 'Account' : t === 'ACCOUNT_WITH_LICENSE' ? 'Account + License' : 'License Code'}
                </button>
              ))}
            </div>
          </div>

          {addType !== 'LICENSE_ONLY' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input type="text" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="account@example.com" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-900 dark:text-white" />
                </div>
              </div>

              {addType === 'ACCOUNT_WITH_LICENSE' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">License Code</label>
                  <input type="text" value={form.licenseCode} onChange={(e) => setForm((f) => ({ ...f, licenseCode: e.target.value }))} placeholder="XXXX-XXXX-XXXX-XXXX" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono focus:outline-none text-gray-900 dark:text-white" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Backup Codes</label>
                  <span className={`text-[10px] font-bold ${addFormBackupCount() === BACKUP_CODE_COUNT ? 'text-emerald-500' : 'text-orange-500'}`}>
                    Backup Codes: {addFormBackupCount()} / {BACKUP_CODE_COUNT}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {form.backupCodes.map((c, i) => (
                    <input
                      key={i}
                      type="text"
                      value={c}
                      onChange={(e) => setForm((f) => {
                        const next = [...f.backupCodes];
                        next[i] = e.target.value;
                        return { ...f, backupCodes: next };
                      })}
                      placeholder={`Code ${String(i + 1).padStart(2, '0')}`}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono focus:outline-none text-gray-900 dark:text-white"
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">License Code(s) — one per line</label>
              <textarea
                rows={5}
                value={form.licenseCode}
                onChange={(e) => setForm((f) => ({ ...f, licenseCode: e.target.value }))}
                placeholder={'LIC-XXXX-1111\nLIC-XXXX-2222'}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono focus:outline-none text-gray-900 dark:text-white"
              />
            </div>
          )}

          {addErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
              {addErrors.map((e: any, i: number) => <div key={i}>• {e.message || e.error}</div>)}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={submitting || addFormInvalid} className="bg-brand-red text-white">
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---------------- Account Detail Modal ---------------- */}
      <Modal
        isOpen={!!detailAccountId}
        onClose={() => setDetailAccountId(null)}
        title={detail?.account?.email ? `PS Plus Account #${detail.account.id}` : 'Account Detail'}
      >
        {detailLoading ? (
          <div className="py-10 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : !detail ? (
          <div className="py-10 text-center text-sm text-gray-500">Account not found.</div>
        ) : (
          <div className="space-y-5">
            {/* Account info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Email</div>
                <div className="text-gray-900 dark:text-white font-medium break-all">{detail.account.email}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Password</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-700 dark:text-gray-200">{revealedPassword || '••••••••••'}</span>
                  {detail.canViewCredentials && (
                    <>
                      <button onClick={handleRevealPassword} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded" title={revealedPassword ? 'Hide' : 'Reveal'}>
                        {revealedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {revealedPassword && (
                        <button onClick={() => copyToClipboard(revealedPassword, 'pwd')} className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Copy">
                          {copiedId === 'pwd' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[detail.account.status] || ''}`}>{detail.account.status}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Created</div>
                <div className="text-gray-900 dark:text-white">{detail.account.created_at ? new Date(detail.account.created_at).toLocaleString() : '—'}</div>
              </div>
            </div>

            {/* License block */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">License</h4>
                <div className="flex gap-2">
                  {detail.license ? (
                    <>
                      <button onClick={handleRemoveLicense} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"><Ban className="w-3 h-3 inline mr-1" />Remove</button>
                    </>
                  ) : (
                    <button onClick={() => setShowAssignPicker((v) => !v)} className="text-[10px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"><KeyRound className="w-3 h-3 inline mr-1" />Assign License</button>
                  )}
                </div>
              </div>
              {detail.license ? (
                detail.canViewCredentials ? (
                  <div className="text-sm font-mono text-gray-900 dark:text-white">{detail.license.license_code}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusColor[detail.license.status] || ''}`}>{detail.license.status.toLowerCase()}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">License assigned (hidden from your role)</p>
                )
              ) : (
                <p className="text-xs text-gray-400 italic">No license assigned to this account.</p>
              )}
              {showAssignPicker && !detail.license && (
                <div className="pt-1">
                  {availableLicenses.length === 0 ? (
                    <p className="text-xs text-gray-400">No available (unassigned) licenses.</p>
                  ) : (
                    <select
                      onChange={(e) => { if (e.target.value) handleAssignLicense(e.target.value); }}
                      value=""
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value="">Choose an available license...</option>
                      {availableLicenses.map((l) => <option key={l.id} value={String(l.id)}>{l.license_code}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Mark sold */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Sale / Assignment</h4>
                {detail.account.status !== 'SOLD' && (
                  <button onClick={() => setShowSoldBox((v) => !v)} className="text-[10px] px-2 py-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80"><ShieldCheck className="w-3 h-3 inline mr-1" />Mark Sold</button>
                )}
              </div>
              {showSoldBox && (
                <div className="pt-2 flex gap-2">
                  <input
                    value={markSoldOrder}
                    onChange={(e) => setMarkSoldOrder(e.target.value)}
                    placeholder="Order number (optional)"
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                  <Button onClick={handleMarkSold} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs">Confirm Sold</Button>
                </div>
              )}
              {detail.account.status === 'SOLD' && (
                <p className="text-xs text-gray-400">This account is SOLD and no longer available.</p>
              )}
            </div>

            {/* Backup codes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Backup Codes</h4>
                <span className="text-[10px] font-bold text-gray-500">
                  {(detail.backupCodes || []).filter((b: BackupCode) => b.status === 'AVAILABLE').length} / {detail.backupCodes?.length || 0} available
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {(detail.backupCodes || []).map((bc: BackupCode, idx: number) => (
                  <div key={bc.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                    bc.status === 'AVAILABLE' ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    : bc.status === 'USED' ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-70'
                    : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'
                  }`}>
                    <span className="text-[10px] text-gray-400 font-bold w-5">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200 flex-1 truncate">{detail.canViewCredentials ? bc.code : '••••••••••'}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${backupStatusColor[bc.status] || ''}`}>{bc.status}</span>
                    {bc.status === 'USED' && bc.used_at && (
                      <span className="text-[9px] text-gray-400" title={new Date(bc.used_at).toLocaleString()}>
                        {new Date(bc.used_at).toLocaleDateString()}
                      </span>
                    )}
                    {detail.canViewCredentials && (
                      <>
                        <button onClick={() => copyToClipboard(bc.code, `bc-${bc.id}`)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Copy">
                          {copiedId === `bc-${bc.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {bc.status === 'AVAILABLE' ? (
                          <button onClick={() => handleMarkBackupUsed(bc)} className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded" title="Mark as Used"><Check className="w-3 h-3" /></button>
                        ) : (
                          <button onClick={() => handleReplaceBackup(bc)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded" title="Replace"><RefreshCw className="w-3 h-3" /></button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit trail */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Audit Trail</h4>
              {auditItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No recorded events for this account.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-1.5 border-r border-gray-200 dark:border-gray-800">Action</th>
                        <th className="px-3 py-1.5 border-r border-gray-200 dark:border-gray-800">User</th>
                        <th className="px-3 py-1.5">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {auditItems.map((a: any) => (
                        <tr key={a.id}>
                          <td className="px-3 py-1.5 border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">{a.action}</td>
                          <td className="px-3 py-1.5 border-r border-gray-200 dark:border-gray-800 text-gray-500">{a.user_email || `#${a.user_id || 'system'}`}</td>
                          <td className="px-3 py-1.5 text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------- Bulk Import Modal ---------------- */}
      <Modal isOpen={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import PS Plus Accounts">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            CSV columns: <span className="font-mono">email,password,backup_code_01,...,backup_code_12,license_code</span> (license optional). The entire file is validated before anything is committed.
          </p>
          <textarea
            rows={8}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'account1@email.com,pass1,C001,C002,C003,C004,C005,C006,C007,C008,C009,C010,C011,C012,LIC001\naccount2@email.com,pass2,C013,C014,C015,C016,C017,C018,C019,C020,C021,C022,C023,C024,LIC002'}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-mono focus:outline-none text-gray-900 dark:text-white"
          />
          <div className="text-xs text-gray-500">Rows parsed: <span className="font-bold">{bulkText.split('\n').filter((l) => l.trim()).length}</span></div>

          {bulkError && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">{bulkError}</div>}

          {bulkReport && (
            <div className={`rounded-lg border p-3 text-xs ${bulkReport.invalid > 0 ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/30' : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30'}`}>
              <div className="font-bold mb-1">
                {bulkReport.invalid > 0 ? `Validation failed: ${bulkReport.invalid} invalid row(s), nothing was committed.` : `All ${bulkReport.valid} row(s) valid and imported.`}
              </div>
              {bulkReport.invalidRows?.map((r: any, i: number) => (
                <div key={i} className="mt-1 text-gray-700 dark:text-gray-300">
                  {r.row > 0 ? `Row ${r.row}: ` : ''}{r.errors?.map((e: any) => e.message).join('; ')}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowBulk(false)}>Close</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkSubmitting || bulkText.trim() === ''} className="bg-brand-red text-white">
              {bulkSubmitting ? 'Validating & importing...' : 'Validate & Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PsPlusInventory;
