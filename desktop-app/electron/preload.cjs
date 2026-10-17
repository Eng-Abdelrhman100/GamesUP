const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posHardware', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (payload) => ipcRenderer.invoke('print-receipt', payload),
  printRaw: (payload) => ipcRenderer.invoke('print-raw', payload),
  printA4Invoice: (payload) => ipcRenderer.invoke('print-a4-invoice', payload),
  openCashDrawer: (payload) => ipcRenderer.invoke('open-cash-drawer', payload),
  isDesktop: true
});

