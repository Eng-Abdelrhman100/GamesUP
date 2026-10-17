import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, RefreshCcw, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { bookingAPI } from '../../utils/api';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type Booking = {
  id: number;
  service_type: string;
  booking_date: string;
  booking_time: string;
  day_of_week?: string | null;
  customer_name: string;
  customer_email?: string | null;
  phone: string;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function toStatus(raw: any): BookingStatus {
  const s = String(raw || 'pending').trim().toLowerCase();
  if (s === 'confirmed') return 'confirmed';
  if (s === 'completed' || s === 'done') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'pending';
}

function formatDate(raw: any) {
  if (!raw) return '-';
  const d = new Date(String(raw).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadgeClass(status: BookingStatus) {
  if (status === 'pending') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  if (status === 'confirmed') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  if (status === 'completed') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingAPI.getAll(statusFilter === 'all' ? undefined : statusFilter);
      setBookings(Array.isArray((data as any)?.bookings) ? (data as any).bookings : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const setStatus = async (id: number, status: BookingStatus) => {
    try {
      setUpdatingId(id);
      const result = await bookingAPI.update(id, { status });
      const updated = (result as any)?.booking;
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...(updated || b), status } : b)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update booking');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeBooking = async (id: number) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await bookingAPI.delete(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete booking');
    }
  };

  const counts = useMemo(() => {
    const out = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) out[toStatus(b.status)] += 1;
    return out;
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-subtitle">Services</p>
          <h1 className="admin-page-title">Service Bookings<span className="text-brand-red">.</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic">
            All: {counts.all} • Pending: {counts.pending} • Confirmed: {counts.confirmed}
          </div>
          <Button onClick={load} variant="outline" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                statusFilter === s
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading bookings...</div>
        ) : error ? (
          <div className="text-center py-12 text-brand-red">{error}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">No bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Service</th>
                  <th className="text-left">Slot</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Notes</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const s = toStatus(b.status);
                  return (
                    <tr key={b.id}>
                      <td className="font-semibold">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-brand-red" />
                          <span className="capitalize">{b.service_type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm font-bold text-text-primary">{formatDate(b.booking_date)}</div>
                        <div className="text-xs text-text-secondary">{b.booking_time} • {b.day_of_week || ''}</div>
                      </td>
                      <td>
                        <div className="text-xs">
                          <div className="font-medium text-text-primary">{b.customer_name}</div>
                          <div className="text-[10px] text-text-secondary">{b.phone}</div>
                          {b.customer_email && <div className="text-[10px] text-text-secondary">{b.customer_email}</div>}
                        </div>
                      </td>
                      <td className="text-xs text-text-secondary max-w-[220px] truncate">{b.notes || '-'}</td>
                      <td>
                        <select
                          value={s}
                          disabled={updatingId === b.id}
                          onChange={(e) => setStatus(b.id, e.target.value as BookingStatus)}
                          className={`px-2 py-1 rounded text-xs font-medium border-none focus:ring-2 cursor-pointer ${statusBadgeClass(s)}`}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => removeBooking(b.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
