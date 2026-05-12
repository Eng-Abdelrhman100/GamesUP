import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: 'bg-emerald-50/90 dark:bg-emerald-900/40 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10',
    error: 'bg-red-50/90 dark:bg-red-900/40 border-red-200/50 dark:border-red-800/50 text-red-900 dark:text-red-100 shadow-red-500/10',
    info: 'bg-blue-50/90 dark:bg-blue-900/40 border-blue-200/50 dark:border-blue-800/50 text-blue-900 dark:text-blue-100 shadow-blue-500/10',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-4 px-6 py-4 rounded-[1.25rem] border backdrop-blur-xl shadow-2xl ${styles[type]} min-w-[320px] max-w-[450px]`}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-black uppercase tracking-tight leading-tight">{type}</p>
        <p className="text-[13px] font-medium opacity-90 leading-snug mt-0.5">{message}</p>
      </div>
      <button 
        onClick={onClose}
        className="flex-shrink-0 p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4 opacity-50 hover:opacity-100" />
      </button>
    </motion.div>
  );
}
