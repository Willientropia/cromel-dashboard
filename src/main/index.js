import { app, shell, BrowserWindow, nativeImage, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { registerIpcHandlers } from './ipcHandlers.js'
import { initFirebase } from './firebase.js'
import { initDB } from './db.js'

function setupAutoUpdater(win) {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', info.version)
  })

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox(win, {
        type: 'info',
        title: 'Atualização disponível',
        message: 'Uma nova versão foi baixada.',
        detail: 'O aplicativo será reiniciado para aplicar a atualização.',
        buttons: ['Reiniciar agora', 'Mais tarde']
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err?.message)
  })

  // Verifica atualizações 3 segundos após o app abrir
  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
}

ipcMain.handle('app:version', () => app.getVersion())

function createWindow() {
  // Use icon.png as the window icon (SVG not supported by nativeImage on all platforms)
  let icon
  try {
    const iconPath = is.dev
      ? join(__dirname, '../../build/icon.png')
      : join(__dirname, '../../build/icon.png')
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = undefined
  } catch {
    icon = undefined
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Cromel Dashboard',
    backgroundColor: '#F0F4F8',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    setupAutoUpdater(win)
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  initFirebase()
  await initDB()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
