import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, MessageCircle, Wrench, Download } from 'lucide-react';
import { bookingAPI } from '../utils/api';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface BookingPageProps {
  onBack: () => void;
}

type DayCfg = { day: string; enabled: boolean; times: string[] };

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekdayName(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return '';
  return WEEK_DAYS[(dt.getDay() + 6) % 7];
}

export const BookingPage = ({ onBack }: BookingPageProps) => {
  const { settings } = useStoreSettings();
  const [serviceType, setServiceType] = useState<'repair' | 'install'>('repair');
  const [enabled, setEnabled] = useState<boolean>(settings?.booking_enabled !== false);
  const [days, setDays] = useState<DayCfg[]>(
    Array.isArray(settings?.booking_days) && settings.booking_days.length > 0
      ? settings.booking_days
      : WEEK_DAYS.map((day) => ({ day, enabled: true, times: [] })),
  );
  const [taken, setTaken] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await bookingAPI.getAvailability(28);
        setEnabled(!!data.enabled);
        if (Array.isArray((data as any)?.days) && (data as any).days.length > 0) {
          setDays((data as any).days.map((d: any) => ({
            day: String(d?.day || ''),
            enabled: d?.enabled !== false,
            times: Array.isArray(d?.times) ? d.times.map((t: any) => String(t)) : [],
          })));
        }
        setTaken((data as any)?.taken || {});
      } catch (err) {
        console.error('Failed to load booking availability:', err);
        setEnabled(settings?.booking_enabled !== false);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Next 28 days limited to admin-enabled weekdays.
  const bookableDates = useMemo(() => {
    const out: { date: string; dayName: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 28; i += 1) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + i);
      const date = toDateStr(dt);
      const dayName = weekdayName(date);
      const cfg = days.find((d) => d.day.toLowerCase() === dayName.toLowerCase());
      if (cfg && cfg.enabled && cfg.times.length > 0) out.push({ date, dayName });
    }
    return out;
  }, [days]);

  useEffect(() => {
    if (!selectedDate && bookableDates.length > 0) setSelectedDate(bookableDates[0].date);
    if (selectedDate && !bookableDates.some((d) => d.date === selectedDate)) {
      setSelectedDate(bookableDates.length > 0 ? bookableDates[0].date : '');
      setSelectedTime('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookableDates]);

  const timesForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const dayName = weekdayName(selectedDate);
    const cfg = days.find((d) => d.day.toLowerCase() === dayName.toLowerCase());
    if (!cfg) return [];
    const takenForDate = taken[selectedDate] || [];
    return cfg.times.filter((t) => !takenForDate.includes(t));
  }, [selectedDate, days, taken]);

  const whatsappUrl = (settings as any)?.whatsapp_url
    ? String((settings as any).whatsapp_url)
    : 'https://wa.me/201008480536';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selectedDate) {
      setError('Please choose a day.');
      return;
    }
    if (!selectedTime) {
      setError('Please choose a time.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingAPI.create({
        service_type: serviceType,
        booking_date: selectedDate,
        booking_time: selectedTime,
        customer_name: name.trim(),
        customer_email: email.trim() || undefined,
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });
      if ((res as any)?.success === false) throw new Error((res as any)?.error || 'Booking failed');
      setSuccess(`Slot booked: ${selectedDate} at ${selectedTime}. We will confirm on WhatsApp shortly.`);
      setTaken((prev) => ({ ...prev, [selectedDate]: [...(prev[selectedDate] || []), selectedTime] }));
      setSelectedTime('');
      setNotes('');
    } catch (err: any) {
      setError(err?.message || 'Failed to book this slot. Please try another time.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark pt-32 pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-black tracking-widest text-text-secondary uppercase">Loading Booking...</span>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-bg-dark pt-32 pb-20">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <CalendarClock className="h-12 w-12 text-text-secondary mx-auto mb-6" />
          <h1 className="text-3xl md:text-5xl font-black uppercase italic text-[var(--text-primary)] mb-4">Booking Unavailable</h1>
          <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-8">Repair & install booking is currently paused. Contact us directly and we&apos;ll help.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic">
              <MessageCircle className="h-4 w-4" /> WhatsApp Us
            </a>
            <button onClick={onBack} className="px-8 py-4 rounded-2xl border border-border-subtle text-[11px] font-black uppercase tracking-widest text-text-secondary">
              Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1000px] mx-auto px-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-8 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-3 italic">Service Booking</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.9] italic mb-4">
          Repair & Install<span className="text-brand-red">.</span>
        </h1>
        <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.3em] italic mb-10">Pick a day and time — availability set by our team</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { id: 'repair', title: 'Repair', desc: 'Console & hardware repair slot', icon: Wrench },
              { id: 'install', title: 'Game Install', desc: 'Install your game with our team', icon: Download },
            ] as const).map(({ id, title, desc, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => setServiceType(id)}
                className={`p-6 rounded-3xl border text-left transition-all ${
                  serviceType === id
                    ? 'border-brand-red bg-brand-red/5 ring-1 ring-brand-red'
                    : 'border-border-subtle bg-bg-card hover:border-brand-red/30'
                }`}
              >
                <div className={`p-3 rounded-xl w-fit mb-3 ${serviceType === id ? 'bg-brand-red text-white' : 'bg-bg-dark text-text-secondary'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-sm font-black uppercase tracking-widest italic ${serviceType === id ? 'text-brand-red' : 'text-[var(--text-primary)]'}`}>{title}</p>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{desc}</p>
              </button>
            ))}
          </div>

          {/* Day picker */}
          <div className="bg-bg-card border border-border-subtle rounded-[2rem] p-6 md:p-8">
            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic mb-4">1 · Choose a Day</h3>
            {bookableDates.length === 0 ? (
              <p className="text-xs text-text-secondary font-bold">No bookable days right now — please check back later.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {bookableDates.map(({ date, dayName }) => {
                  const dt = new Date(date + 'T00:00:00');
                  const active = selectedDate === date;
                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                      className={`shrink-0 w-20 py-4 rounded-2xl border text-center transition-all ${
                        active
                          ? 'border-brand-red bg-brand-red text-white shadow-lg shadow-brand-red/20'
                          : 'border-border-subtle bg-bg-dark text-[var(--text-primary)] hover:border-brand-red/40'
                      }`}
                    >
                      <span className={`block text-[9px] font-black uppercase tracking-widest ${active ? 'text-white/80' : 'text-brand-red'}`}>{dayName.slice(0, 3)}</span>
                      <span className="block text-xl font-black italic">{dt.getDate()}</span>
                      <span className={`block text-[9px] font-bold uppercase ${active ? 'text-white/80' : 'text-text-secondary'}`}>
                        {dt.toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time picker */}
          <div className="bg-bg-card border border-border-subtle rounded-[2rem] p-6 md:p-8">
            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic mb-4">2 · Choose a Time</h3>
            {!selectedDate ? (
              <p className="text-xs text-text-secondary font-bold">Select a day first.</p>
            ) : timesForSelected.length === 0 ? (
              <p className="text-xs text-text-secondary font-bold">All times taken for this day — please pick another day.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {timesForSelected.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`px-6 py-3 rounded-2xl border text-sm font-black italic tracking-widest transition-all ${
                      selectedTime === t
                        ? 'border-brand-red bg-brand-red text-white shadow-lg shadow-brand-red/20'
                        : 'border-border-subtle bg-bg-dark text-[var(--text-primary)] hover:border-brand-red/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="bg-bg-card border border-border-subtle rounded-[2rem] p-6 md:p-8 space-y-5">
            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic">3 · Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 01012345678"
                  className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john.doe@example.com"
                  className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Notes (optional)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Console model, game title, issue description..."
                className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-500/25 text-green-500 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedDate || !selectedTime}
            className="w-full bg-brand-red text-white py-5 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 uppercase italic hover:opacity-90 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</>
            ) : (
              <><CalendarClock className="h-4 w-4" /> Confirm Booking</>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-green-500 transition-colors italic"
          >
            <MessageCircle className="h-4 w-4" />
            Questions? Chat with us on WhatsApp
          </a>
        </form>
      </div>
    </div>
  );
}
