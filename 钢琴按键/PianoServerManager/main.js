const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 550,
    resizable: false,
    title: '钢琴服务器管理器',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.removeMenu();
}

app.whenReady().then(createWindow);

ipcMain.handle('getVersions', async () => {
  const parentDir = path.dirname(app.getAppPath());
  const versions = [];
  
  try {
    const files = fs.readdirSync(parentDir, { withFileTypes: true });
    files.forEach(file => {
      if (file.isDirectory() && file.name.startsWith('版本')) {
        versions.push(file.name);
      }
    });
  } catch (err) {
    console.error(err);
  }
  
  return versions.sort();
});

ipcMain.handle('startServer', async (event, version) => {
  return new Promise((resolve) => {
    exec('taskkill /F /IM node.exe', () => {
      const serverPath = path.join(path.dirname(app.getAppPath()), version, 'server');
      
      if (!fs.existsSync(serverPath)) {
        resolve({ success: false, message: '版本目录不存在' });
        return;
      }

      const child = spawn('npm', ['start'], { 
        cwd: serverPath,
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref();
      
      setTimeout(() => {
        exec('start http://localhost:3000');
        resolve({ success: true, message: '服务器启动成功' });
      }, 3000);
    });
  });
});

ipcMain.handle('stopServer', async () => {
  return new Promise((resolve) => {
    exec('taskkill /F /IM node.exe', (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, message: '没有运行中的服务器' });
      } else {
        resolve({ success: true, message: '服务器已停止' });
      }
    });
  });
});

ipcMain.handle('openBrowser', async () => {
  exec('start http://localhost:3000');
  return { success: true };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});