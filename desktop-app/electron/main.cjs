const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

function getRawPrinterExe() {
  const candidates = [
    path.join(__dirname, 'raw_print.exe'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'electron', 'raw_print.exe'),
    path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'electron', 'raw_print.exe'),
    path.join(__dirname, '../electron/raw_print.exe')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, 'raw_print.exe');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GamesUP POS Terminal',
    icon: path.join(__dirname, '../build/icon.ico'),
    backgroundColor: '#0a0a0c',
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;


  mainWindow.webContents.on('did-fail-load', (e, code, desc, validatedURL) => {
    if (validatedURL && validatedURL.includes('localhost:5173')) {
      console.log('Dev server not running at 5173, loading dist/index.html');
      const distPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
      }
    }
  });

  if (isDev && !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      const distPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distPath)) mainWindow.loadFile(distPath);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Get OS Printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Error fetching printers:', err);
    return [];
  }
});

// IPC: Direct Thermal Receipt Printing
ipcMain.handle('print-receipt', async (event, { printerName, silent = true, htmlContent, paperWidth = '80mm', autoCut = true }) => {
  return new Promise((resolve) => {
    let printWindow = new BrowserWindow({
      show: false,
      width: paperWidth === '58mm' ? 240 : 320,
      height: 800,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    let isResolved = false;
    const finish = (result) => {
      if (isResolved) return;
      isResolved = true;
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.close();
      }
      printWindow = null;
      resolve(result);
    };

    const safetyTimeout = setTimeout(() => {
      finish({ success: false, errorType: 'Print timeout (printer may be offline or unreachable)' });
    }, 15000);

    printWindow.webContents.on('did-fail-load', (e, code, desc) => {
      clearTimeout(safetyTimeout);
      finish({ success: false, errorType: `Failed to load receipt HTML: ${desc}` });
    });

    const widthMicrons = paperWidth === '58mm' ? 58000 : 80000;

    printWindow.webContents.on('did-finish-load', async () => {
      try {
        // Measure real content height to fit exact receipt size instead of wasting a 297mm sheet
        let calculatedHeightMicrons = 160000;
        try {
          const contentHeightPx = await printWindow.webContents.executeJavaScript(
            `Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 350)`
          );
          if (contentHeightPx && contentHeightPx > 0) {
            // 96 DPI: 1px = ~264.6 microns. Add feed buffer (20-22mm) so auto-cutter clears the footer cleanly
            calculatedHeightMicrons = Math.ceil(contentHeightPx * 264.6) + (autoCut ? 22000 : 8000);
          }
        } catch (e) {
          console.warn('Could not measure content height, using fallback roll height:', e);
        }

        setTimeout(() => {
          if (!printWindow || printWindow.isDestroyed()) return;
          printWindow.webContents.print(
            {
              silent: silent,
              printBackground: true,
              deviceName: printerName || undefined,
              margins: { marginType: 'none' },
              pageSize: { width: widthMicrons, height: calculatedHeightMicrons }
            },
            (success, errorType) => {
              clearTimeout(safetyTimeout);
              finish({ success, errorType });
            }
          );
        }, 150);
      } catch (err) {
        clearTimeout(safetyTimeout);
        finish({ success: false, errorType: err.message });
      }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  });
});

// IPC: Print A4 Official Tax Invoice
ipcMain.handle('print-a4-invoice', async (event, { printerName, silent = false, htmlContent }) => {
  return new Promise((resolve) => {
    let printWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 1100,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    let isResolved = false;
    const finish = (result) => {
      if (isResolved) return;
      isResolved = true;
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.close();
      }
      printWindow = null;
      resolve(result);
    };

    const safetyTimeout = setTimeout(() => {
      finish({ success: false, errorType: 'Print timeout' });
    }, 20000);

    printWindow.webContents.on('did-fail-load', (e, code, desc) => {
      clearTimeout(safetyTimeout);
      finish({ success: false, errorType: `Failed to load invoice HTML: ${desc}` });
    });

    printWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        if (!printWindow || printWindow.isDestroyed()) return;
        printWindow.webContents.print(
          {
            silent: silent,
            printBackground: true,
            deviceName: printerName || undefined,
            pageSize: 'A4'
          },
          (success, errorType) => {
            clearTimeout(safetyTimeout);
            finish({ success, errorType });
          }
        );
      }, 150);
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  });
});

// IPC: Direct RAW ESC/POS Raster Printing via Win32 Print Spooler (RAW Datatype)
ipcMain.handle('print-raw', async (event, { printerName, base64Data }) => {
  return new Promise(async (resolve) => {
    try {
      let targetPrinter = printerName;
      if (!targetPrinter && mainWindow) {
        try {
          const printers = await mainWindow.webContents.getPrintersAsync();
          const defaultPrinter = printers.find(p => p.isDefault);
          if (defaultPrinter) targetPrinter = defaultPrinter.name;
          else if (printers.length > 0) targetPrinter = printers[0].name;
        } catch (e) {
          console.warn('Failed to query default printer:', e);
        }
      }
      if (!targetPrinter) {
        targetPrinter = 'XP-Q808K (POS-80)';
      }

      const rawPrinterExe = getRawPrinterExe();
      if (!fs.existsSync(rawPrinterExe)) {
        console.error('raw_print.exe not found at', rawPrinterExe);
        return resolve({ success: false, errorType: 'raw_print.exe not found' });
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const tempPath = path.join(app.getPath('temp') || os.tmpdir(), `gup_receipt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.bin`);
      fs.writeFileSync(tempPath, buffer);

      execFile(rawPrinterExe, [targetPrinter, tempPath], { windowsHide: true }, (err, stdout, stderr) => {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.warn('Failed to delete temp print file:', cleanupErr);
        }

        if (err) {
          console.error('Error executing raw_print.exe:', err, stderr);
          return resolve({ success: false, errorType: stderr || err.message });
        }

        const out = stdout ? stdout.trim() : '';
        console.log(`[RAW Print] Output: ${out}`);
        if (out.includes('ERROR:')) {
          return resolve({ success: false, errorType: out });
        }

        resolve({ success: true });
      });
    } catch (err) {
      console.error('print-raw handler exception:', err);
      resolve({ success: false, errorType: err.message });
    }
  });
});

// IPC: Open Cash Drawer (RJ11 Kick Pulse)
ipcMain.handle('open-cash-drawer', async (event, { printerName }) => {
  try {
    let targetPrinter = printerName;
    if (!targetPrinter && mainWindow) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const defaultPrinter = printers.find(p => p.isDefault);
      if (defaultPrinter) targetPrinter = defaultPrinter.name;
    }
    if (!targetPrinter) targetPrinter = 'XP-Q808K (POS-80)';

    const rawPrinterExe = getRawPrinterExe();
    if (fs.existsSync(rawPrinterExe)) {
      // ESC p 0 25 250 command to kick drawer
      const pulseBytes = Buffer.from([27, 112, 0, 25, 250]);
      const tempPath = path.join(app.getPath('temp') || os.tmpdir(), `gup_drawer_${Date.now()}.bin`);
      fs.writeFileSync(tempPath, pulseBytes);
      execFile(rawPrinterExe, [targetPrinter, tempPath], { windowsHide: true }, () => {
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
      });
    }
    console.log(`[Drawer] Pulse sent to printer: ${targetPrinter}`);
    return { success: true };
  } catch (err) {
    console.error('Drawer kick error:', err);
    return { success: false };
  }
});

