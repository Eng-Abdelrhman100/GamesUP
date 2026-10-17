import React, { useEffect, useRef } from 'react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface BarcodeListenerProps {
  products: Product[];
  onScanSuccess?: (productName: string) => void;
}

export const BarcodeListener: React.FC<BarcodeListenerProps> = ({ products, onScanSuccess }) => {
  const { scanBarcode } = useCart();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in a normal text input/textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Hardware barcode scanners emit keystrokes rapidly (typically < 35ms between keys)
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 3) {
          const matched = scanBarcode(barcode, products);
          if (matched && onScanSuccess) {
            onScanSuccess(barcode);
          }
        }
        return;
      }

      // If time difference is very large (> 200ms) and user is typing in an input, reset buffer
      if (timeDiff > 200 && isInput) {
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, scanBarcode, onScanSuccess]);

  return null;
};
