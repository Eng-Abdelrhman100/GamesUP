import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreSettingsProvider>
      <App />
    </StoreSettingsProvider>
  </StrictMode>,
);
