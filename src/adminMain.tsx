import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AdminApp from './admin/AdminApp';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <StoreSettingsProvider>
      <BrowserRouter>
        <AdminApp />
      </BrowserRouter>
    </StoreSettingsProvider>
  </ErrorBoundary>
);
