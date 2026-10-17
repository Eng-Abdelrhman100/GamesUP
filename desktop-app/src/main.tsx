import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { ShiftProvider } from './context/ShiftContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <CartProvider>
        <ShiftProvider>
          <App />
        </ShiftProvider>
      </CartProvider>
    </SettingsProvider>
  </React.StrictMode>
);
