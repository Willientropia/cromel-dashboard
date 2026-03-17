/**
 * Script de release do bundle mobile.
 *
 * O que faz:
 *   1. Lê a versão atual de mobile/package.json
 *   2. Constrói o bundle Vite (npm run build)
 *   3. Compacta dist/ → mobile-bundle.zip
 *   4. Cria (ou atualiza) uma GitHub Release com tag v{versão}
 *      e faz upload do mobile-bundle.zip como asset
 *
 * Uso:
 *   node mobile/scripts/release.mjs
 *
 * Requer:
 *   - GH_TOKEN no ambiente (export GH_TOKEN=ghp_...) com permissão Contents: Write
 *   - "gh" CLI instalado (https://cli.github.com) OU usa fetch direto via API
 *
 * Antes de publicar uma nova versão:
 *   1. Suba a versão em mobile/package.json (ex: "1.0.0" → "1.0.1")
 *   2. Faça o mesmo no package.json raiz para manter em sincronia
 *   3. Rode este script
 */

import { execSync } from 'child_process'
import { createReadStream, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createGzip } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(__dirname, '..')
const repoRoot = resolve(mobileRoot, '..')

const pkg = JSON.parse(
  (await import('fs')).readFileSync(resolve(mobileRoot, 'package.json'), 'utf8')
)
const version = pkg.version
const tag = `v${version}`

const OWNER = 'Willientropia'
const REPO = 'cromel-dashboard'
const GH_TOKEN = process.env.GH_TOKEN

if (!GH_TOKEN) {
  console.error('❌  GH_TOKEN não encontrado. Exporte antes de rodar:')
  console.error('    export GH_TOKEN=ghp_...')
  process.exit(1)
}

const headers = {
  Authorization: `token ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
}

// ── 1. Build ──────────────────────────────────────────────────────────────────
console.log(`\n📦  Buildando bundle mobile v${version}...`)
execSync('npm run build', { cwd: mobileRoot, stdio: 'inherit' })

// ── 2. Zip do dist/ ───────────────────────────────────────────────────────────
const zipPath = resolve(mobileRoot, 'mobile-bundle.zip')
console.log('\n🗜️   Compactando dist/ → mobile-bundle.zip...')
execSync(`cd "${mobileRoot}" && npx bestzip "${zipPath}" dist/`, {
  cwd: mobileRoot,
  stdio: 'inherit'
})

// ── 3. Cria ou busca a release ────────────────────────────────────────────────
console.log(`\n🚀  Verificando release ${tag} no GitHub...`)

let release
const listRes = await fetch(
  `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${tag}`,
  { headers }
)

if (listRes.ok) {
  release = await listRes.json()
  console.log(`    Release ${tag} já existe (id ${release.id}), atualizando asset...`)
} else {
  // Cria a release (draft: false, prerelease: false)
  const createRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tag_name: tag,
        name: `Cromel Dashboard ${version}`,
        draft: false,
        prerelease: false
      })
    }
  )
  if (!createRes.ok) {
    const err = await createRes.text()
    console.error('❌  Falha ao criar release:', err)
    process.exit(1)
  }
  release = await createRes.json()
  console.log(`    Release ${tag} criada (id ${release.id}).`)
}

// ── 4. Remove asset antigo se existir ────────────────────────────────────────
const existingAsset = release.assets?.find((a) => a.name === 'mobile-bundle.zip')
if (existingAsset) {
  console.log('    Removendo asset anterior...')
  await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${existingAsset.id}`,
    { method: 'DELETE', headers }
  )
}

// ── 5. Upload do mobile-bundle.zip ───────────────────────────────────────────
console.log('\n⬆️   Fazendo upload de mobile-bundle.zip...')
const zipSize = statSync(zipPath).size
const uploadUrl = release.upload_url.replace('{?name,label}', `?name=mobile-bundle.zip`)

const uploadRes = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    Authorization: `token ${GH_TOKEN}`,
    'Content-Type': 'application/zip',
    'Content-Length': zipSize
  },
  body: createReadStream(zipPath),
  duplex: 'half'
})

if (!uploadRes.ok) {
  const err = await uploadRes.text()
  console.error('❌  Falha ao fazer upload:', err)
  process.exit(1)
}

console.log(`\n✅  mobile-bundle.zip publicado na release ${tag}!`)
console.log(`    https://github.com/${OWNER}/${REPO}/releases/tag/${tag}`)
console.log('\n💡  Lembre de colocar o mesmo GH_TOKEN de leitura em mobile/src/updater.js')
