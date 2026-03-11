import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipcHandlers.js'
import { initDB } from './db.js'

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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
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

app.whenReady().then(() => {
  initDB()
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
