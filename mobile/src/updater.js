import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { Capacitor } from '@capacitor/core'

// Token com permissão apenas de leitura de releases (Contents: Read-only)
const GH_TOKEN = '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'
const OWNER = 'Willientropia'
const REPO = 'cromel-dashboard'
const BUNDLE_ASSET = 'mobile-bundle.zip'

let _updateCallback = null
let _checking = false
let _pendingAsset = null // { assetUrl, version } — preenchido ao detectar update

export function notifyReady() {
  if (Capacitor.isNativePlatform()) {
    CapacitorUpdater.notifyAppReady()
  }
}

// Acionado pelo usuário via botão — faz o download e aplica
export async function downloadAndApply() {
  if (!_pendingAsset) throw new Error('Nenhuma atualização pendente.')
  const { assetUrl, version } = _pendingAsset
  const bundle = await CapacitorUpdater.download({
    url: assetUrl,
    version,
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: 'application/octet-stream'
    }
  })
  await CapacitorUpdater.set(bundle)
  // O app reinicia automaticamente com o novo bundle
}

// Apenas detecta se há update — NÃO baixa automaticamente
export async function checkForUpdates(currentVersion) {
  if (!Capacitor.isNativePlatform() || _checking) return
  _checking = true
  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json', Authorization: `token ${GH_TOKEN}` } }
    )
    if (!res.ok) return

    const release = await res.json()
    const latestVersion = release.tag_name?.replace(/^v/, '')
    if (!latestVersion || latestVersion === currentVersion) return

    const asset = release.assets?.find((a) => a.name === BUNDLE_ASSET)
    if (!asset) return

    // browser_download_url é a URL direta (github.com/...releases/download/...)
    // Evita o redirect 302 da API que o código nativo não consegue seguir corretamente
    _pendingAsset = { assetUrl: asset.browser_download_url, version: latestVersion }
    _updateCallback?.(latestVersion)
  } catch (e) {
    console.error('[updater] falha ao verificar atualização:', e?.message)
  } finally {
    _checking = false
  }
}

export function onUpdateAvailable(cb, currentVersion) {
  _updateCallback = cb
  setTimeout(() => checkForUpdates(currentVersion), 3000)
}
