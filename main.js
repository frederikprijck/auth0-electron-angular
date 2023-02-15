const {app, BrowserWindow, ipcMain, shell} = require('electron')
const url = require("url");
const path = require("path");

let mainWindow
let authWindow

function createAuthWindow(url) {
  authWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  authWindow.loadURL(url);

  const {session: {webRequest}} = authWindow.webContents;

  const filter = {
    urls: [
      'http://localhost/callback*',
      'http://localhost/logout*',
    ]
  };

  webRequest.onBeforeRequest(filter, async ({url}) => {
    if (url.indexOf('callback') > -1) {
      mainWindow.webContents.send('handleCallback', url);
    }

    destroyAuthWin();
  });

}

function destroyAuthWin() {
  if (!authWindow) return;
  authWindow.close();
  authWindow = null;
}

function createWindow () {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/auth0-electron-angular/index.html`),
      protocol: "file:",
      slashes: true
    })
  );
  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

ipcMain.handle('login', (_, url) => {
  createAuthWindow(url);
});

ipcMain.handle('logout', (_, url) => {
  createAuthWindow(url);
});
