import React, { createContext, useContext, useState, useEffect } from 'react';
import { CashShift, PaymentMethod } from '../types';

interface ShiftContextType {
  activeShift: CashShift | null;
  openShift: (cashierName: string, openingCash: number) => void;
  recordSale: (total: number, method: PaymentMethod) => void;
  recordCashDrop: (amount: number, reason: string) => void;
  closeShift: (actualCountedCash: number) => { variance: number; shift: CashShift };
}

const ShiftContext = createContext<ShiftContextType | null>(null);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeShift, setActiveShift] = useState<CashShift | null>(() => {
    const saved = localStorage.getItem('gamesup_active_shift');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (activeShift) {
      localStorage.setItem('gamesup_active_shift', JSON.stringify(activeShift));
    } else {
      localStorage.removeItem('gamesup_active_shift');
    }
  }, [activeShift]);

  const openShift = (cashierName: string, openingCash: number) => {
    const newShift: CashShift = {
      id: `SHIFT-${Date.now().toString().slice(-6)}`,
      cashierId: 'CASHIER-01',
      cashierName,
      startTime: new Date().toISOString(),
      openingCash: Math.max(0, openingCash),
      expectedCashTotal: Math.max(0, openingCash),
      cashSalesTotal: 0,
      cardSalesTotal: 0,
      instaPaySalesTotal: 0,
      cashDropsTotal: 0,
      status: 'OPEN'
    };
    setActiveShift(newShift);
  };

  const recordSale = (total: number, method: PaymentMethod) => {
    if (!activeShift || activeShift.status !== 'OPEN') return;

    setActiveShift(prev => {
      if (!prev) return null;
      let cashInc = 0;
      let cardInc = 0;
      let instaInc = 0;

      if (method === 'CASH') cashInc = total;
      else if (method === 'CARD') cardInc = total;
      else instaInc = total;

      return {
        ...prev,
        cashSalesTotal: prev.cashSalesTotal + cashInc,
        cardSalesTotal: prev.cardSalesTotal + cardInc,
        instaPaySalesTotal: prev.instaPaySalesTotal + instaInc,
        expectedCashTotal: prev.expectedCashTotal + cashInc
      };
    });
  };

  const recordCashDrop = (amount: number, reason: string) => {
    if (!activeShift) return;
    setActiveShift(prev => {
      if (!prev) return null;
      return {
        ...prev,
        cashDropsTotal: prev.cashDropsTotal + amount,
        expectedCashTotal: prev.expectedCashTotal - amount
      };
    });
  };

  const closeShift = (actualCountedCash: number) => {
    if (!activeShift) throw new Error('No active shift to close');

    const variance = actualCountedCash - activeShift.expectedCashTotal;
    const closed: CashShift = {
      ...activeShift,
      endTime: new Date().toISOString(),
      closingCashActual: actualCountedCash,
      status: 'CLOSED'
    };

    // Save to historical shift logs
    const history = JSON.parse(localStorage.getItem('gamesup_shift_history') || '[]');
    history.unshift(closed);
    localStorage.setItem('gamesup_shift_history', JSON.stringify(history));

    setActiveShift(null);
    return { variance, shift: closed };
  };

  return (
    <ShiftContext.Provider value={{
      activeShift,
      openShift,
      recordSale,
      recordCashDrop,
      closeShift
    }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used within ShiftProvider');
  return context;
};
