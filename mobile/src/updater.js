import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { Capacitor } from '@capacitor/core'

// Token com permissão apenas de leitura de releases (Contents: Read-only)
// Mesmo token usado pelo desktop (electron-updater)
const GH_TOKEN = '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'
const OWNER = 'Willientropia'
const REPO = 'cromel-dashboard'
const BUNDLE_ASSET = 'mobile-bundle.zip'

let _updateCallback = null
let _checking = false

export function notifyReady() {
  if (Capacitor.isNativePlatform()) {
    CapacitorUpdater.notifyAppReady()
  }
}

// GitHub redireciona assets privados para uma URL temporária de CDN.
// Capturamos essa URL para passar ao CapacitorUpdater (que não suporta headers).
async function resolveDownloadUrl(assetApiUrl) {
  const headers = { Accept: 'application/octet-stream' }
  if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`
  const res = await fetch(assetApiUrl, { headers, redirect: 'follow' })
  return res.url
}

export async function checkForUpdates(currentVersion) {
  if (!Capacitor.isNativePlatform() || _checking) return
  _checking = true
  try {
    const headers = { Accept: 'application/vnd.github+json' }
    if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`

    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
      { headers }
    )
    if (!res.ok) return

    const release = await res.json()
    const latestVersion = release.tag_name?.replace(/^v/, '') // "v1.0.1" → "1.0.1"
    if (!latestVersion || latestVersion === currentVersion) return

    // Notifica a UI (mesmo padrão do desktop: banner "Nova versão X disponível")
    _updateCallback?.(latestVersion)

    const asset = release.assets?.find((a) => a.name === BUNDLE_ASSET)
    if (!asset) return

    const downloadUrl = await resolveDownloadUrl(asset.url)
    const bundle = await CapacitorUpdater.download({ url: downloadUrl, version: latestVersion })
    await CapacitorUpdater.set(bundle)
    // O app reinicia automaticamente com o novo bundle
  } catch (e) {
    console.error('[updater] falha ao verificar atualização:', e?.message)
  } finally {
    _checking = false
  }
}

export function onUpdateAvailable(cb, currentVersion) {
  _updateCallback = cb
  // Mesmo delay do desktop: 3 segundos após abertura
  setTimeout(() => checkForUpdates(currentVersion), 3000)
}
