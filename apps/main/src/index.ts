import path from 'node:path';
import { app, BrowserWindow } from 'electron';

const isDevelopment = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1200,
    minHeight: 780,
    title: 'AI Bot Studio',
    backgroundColor: '#07111f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDevelopment) {
    void mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(__dirname, '../renderer/dist/index.html');
    void mainWindow.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
