import { useEffect, useMemo, useState } from 'react';
import { Gamepad2, RefreshCcw, Image as ImageIcon, Pencil, Save } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { gameRequestsAPI } from '../../utils/api';

type RequestStatus = 'new' | 'in_progress' | 'done' | 'rejected';

type GameRequest = {
  id: number;
  title: string;
  region?: string | null;
  account_type?: string | null;
  notes?: string | null;
  image_url?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  status?: RequestStatus | string | null;
  created_at?: string | null;
};

function toStatus(raw: any): RequestStatus {
  const s = String(raw || 'new').trim().toLowerCase();
  if (s === 'done' || s === 'completed') return 'done';
  if (s === 'in_progress' || s === 'in progress' || s === 'progress') return 'in_progress';
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'rejected';
  return 'new';
}

function formatDate(raw: any) {
  if (!raw) return '-';
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString();
}

function statusBadgeClass(status: RequestStatus) {
  if (status === 'new') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  if (status === 'in_progress') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  if (status === 'done') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

export function GameRequests() {
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GameRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<RequestStatus>('new');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameRequestsAPI.getAll(200);
      const list = Array.isArray((data as any)?.requests) ? (data as any).requests : [];
      setRequests(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRequest = (r: GameRequest) => {
    setSelected(r);
    setEditing(false);
    setEditStatus(toStatus(r.status));
    setEditNotes(String(r.notes || ''));
  };

  const closeModal = () => {
    setSelected(null);
    setEditing(false);
    setSaving(false);
  };

  const onSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const result = await gameRequestsAPI.update(selected.id, { status: editStatus, notes: editNotes });
      const updated = (result as any)?.request ? (result as any).request : null;
      setRequests((prev) => prev.map((x) => (x.id === selected.id ? { ...x, ...(updated || {}), status: editStatus, notes: editNotes } : x)));
      setSelected((prev) => (prev ? { ...prev, ...(updated || {}), status: editStatus, notes: editNotes } : prev));
      setEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const out = { all: requests.length, new: 0, in_progress: 0, done: 0, rejected: 0 };
    for (const r of requests) out[toStatus(r.status)] += 1;
    return out;
  }, [requests]);

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-subtitle">Requests</p>
          <h1 className="admin-page-title">Requested Games<span className="text-brand-red">.</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic">
            All: {counts.all} • New: {counts.new} • Progress: {counts.in_progress} • Done: {counts.done}
          </div>
          <Button onClick={load} variant="outline" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading requests...</div>
        ) : error ? (
          <div className="text-center py-12 text-brand-red">{error}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">No requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Title</th>
                  <th className="text-left">Platform</th>
                  <th className="text-left">Access Type</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const s = toStatus(r.status);
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => openRequest(r)}
                    >
                      <td className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-4 w-4 text-brand-red" />
                          <span className="truncate">{r.title}</span>
                        </div>
                      </td>
                      <td className="text-text-secondary">{r.region || '-'}</td>
                      <td className="text-text-secondary">{r.account_type || '-'}</td>
                      <td>
                        <div className="text-xs">
                          <div className="font-medium text-text-primary">{r.customer_name || '-'}</div>
                          <div className="text-[10px] text-text-secondary">{r.customer_email || '-'}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(s)}`}>
                          {s}
                        </span>
                      </td>
                      <td className="text-text-secondary">{formatDate(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selected}
        onClose={closeModal}
        title="Request Details"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-bold text-text-primary">{selected.title}</div>
                <div className="text-xs text-text-secondary mt-1">
                  {selected.region || '—'} • {selected.account_type || '—'} • {formatDate(selected.created_at)}
                </div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(toStatus(selected.status))}`}>
                {toStatus(selected.status)}
              </span>
            </div>

            <div className="border-t border-b border-border-subtle py-3 my-2 space-y-2">
              <div className="text-xs font-bold text-brand-red uppercase tracking-wider">User Details</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary block">Name:</span>
                  <span className="font-bold text-text-primary">{selected.customer_name || '—'}</span>
                </div>
                <div>
                  <span className="text-text-secondary block">Email:</span>
                  <a href={`mailto:${selected.customer_email}`} className="font-bold text-brand-red hover:underline block truncate">
                    {selected.customer_email || '—'}
                  </a>
                </div>
                <div>
                  <span className="text-text-secondary block">Phone:</span>
                  <a href={`tel:${selected.customer_phone}`} className="font-bold text-text-primary hover:underline block">
                    {selected.customer_phone || '—'}
                  </a>
                </div>
              </div>
            </div>

            {selected.image_url ? (
              <div className="rounded-2xl overflow-hidden border border-border-subtle bg-bg-primary">
                <img src={String(selected.image_url)} alt="Request" className="w-full h-56 object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl border border-border-subtle bg-bg-primary p-6 flex items-center gap-3 text-text-secondary">
                <ImageIcon className="h-5 w-5" />
                No image uploaded.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(toStatus(e.target.value))}
                  disabled={!editing}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                >
                  <option value="new">new</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className="flex items-end justify-end gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} variant="outline" className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <Button onClick={onSave} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2" disabled={saving}>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 disabled:opacity-60"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

