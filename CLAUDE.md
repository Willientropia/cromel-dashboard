# Cromel Dashboard — Contexto para Claude Code

## Visão geral do projeto

Aplicação de gestão de serviços para a Cromel com dois clientes:

- **Desktop (Electron + React/Vite)** — instalado em Windows via NSIS
- **Mobile (Capacitor Android + React/Vite)** — APK para Android

Ambos usam **Firebase Firestore** como banco de dados em tempo real.

## Estrutura principal

```
/                         → app desktop Electron
  src/main/               → processo principal Electron
  src/renderer/src/       → UI React compartilhada (desktop)
  src/renderer/src/api/   → wrapper window.api para Electron
  electron-builder.yml    → config de build/publish Windows
  package.json            → versão do desktop (deve estar em sincronia com mobile)

/mobile/                  → app mobile Android
  src/                    → UI React (reutiliza componentes do renderer)
  src/api/                → API Firebase direto (Web SDK, sem IPC)
  src/updater.js          → verificador de updates OTA via GitHub Releases
  scripts/release.mjs     → script de publicação do bundle mobile
  capacitor.config.json   → config do Capacitor
  package.json            → versão do mobile (deve estar em sincronia com desktop)
  android/                → projeto Android Studio gerado pelo Capacitor
```

## Sistema de atualização

### Desktop (Electron)
- Usa `electron-updater` com GitHub Releases
- Token de **leitura** hardcoded em `src/main/index.js` (Contents: Read-only)
- Verifica atualização 3s após abertura → baixa e instala ao fechar
- A versão exibida na tela de login vem de `app.getVersion()` via IPC

### Mobile (Capacitor + OTA)
- Usa `@capgo/capacitor-updater` com bundle hospedado no GitHub Releases
- Token de **leitura** hardcoded em `mobile/src/updater.js` (Contents: Read-only)
- Verifica atualização 3s após abertura — **NÃO baixa automaticamente**
- Exibe banner com botão "Instalar agora" na tela de login; o download só ocorre ao clicar
- O asset esperado na release se chama `mobile-bundle.zip` (gerado por `mobile/scripts/release.mjs`)
- **Importante**: usar `asset.browser_download_url` (não `asset.url`) — a API URL retorna redirect 302 que o código nativo não consegue seguir

### Dois tokens GitHub
| Token | Permissão | Onde fica |
|-------|-----------|-----------|
| Leitura | Contents: Read-only | Hardcoded no código (`src/main/index.js`, `mobile/src/updater.js`) |
| **Escrita** | Contents: Read and write | Apenas em `release.ps1` (gitignored — NUNCA commitar) |

## Como publicar uma nova versão

> **Importante:** desktop e mobile devem sempre ter a mesma versão.

1. Atualize `"version"` em **`package.json`** (raiz)
2. Atualize `"version"` em **`mobile/package.json`** para o mesmo valor
3. Commite as mudanças: `git add -A && git commit -m "chore: bump versão X.Y.Z"`
4. Execute o script de release (token de escrita já embutido):
   ```powershell
   .\release.ps1          # publica Windows + mobile juntos
   .\release.ps1 win      # só Windows
   .\release.ps1 mobile   # só mobile (bundle OTA)
   ```

O script faz automaticamente:
- **Windows**: `electron-vite build` → `electron-builder --publish always` → GitHub Release com `latest.yml` + `.exe`
- **Mobile**: `vite build` → `bestzip dist/ → mobile-bundle.zip` → upload como asset na mesma GitHub Release

### Dica: release.ps1 está no .gitignore
Se o arquivo `release.ps1` não existir (clone novo, outro colaborador), recrie-o a partir deste documento — ele precisa do token de escrita que não fica no git.

## Configuração de build

### Desktop — `electron-builder.yml`
- `publish.releaseType: release` — garante que a release não seja criada como Draft
- `publish.private: true` — repositório privado, exige token para baixar

### Mobile — `mobile/scripts/release.mjs`
- Lê a versão de `mobile/package.json`
- Cria/atualiza a release da mesma tag que o desktop (ex: `v1.0.1`)
- Remove e recria o asset `mobile-bundle.zip` se já existir

## Banco de dados

Firebase Firestore. As credenciais de **serviço** ficam em `firebase-service-account.json` (gitignored).
A config do SDK Web (pública) fica inline no código (`mobile/src/api/firebase.js` e `src/main/firebase.js`).

## Storage de arquivos (fotos de comentários)

Fotos anexadas em comentários de tarefas são armazenadas no **Supabase Storage** (não Firebase).
- Projeto: `fnfdilnlexznzkmzogwd` → URL: `https://fnfdilnlexznzkmzogwd.supabase.co`
- Bucket: `comment-photos` (público)
- URL pública das fotos: `https://fnfdilnlexznzkmzogwd.supabase.co/storage/v1/object/public/comment-photos/{arquivo}`
- Desktop: upload via `src/main/db.js` usando `@supabase/supabase-js` (Admin SDK não suportava Storage sem plano pago)
- Mobile: upload via `mobile/src/api/index.js` usando `@supabase/supabase-js` direto
- Comentários armazenam `imageUrls: string[]` no Firestore (comentários antigos usam `imageUrl: string` — ambos são suportados na exibição)

## Mobile — detalhes de implementação

### Build correto para Android
```bash
cd mobile
npm run build      # builda o JS (obrigatório antes de gerar APK)
npm run cap:sync   # sincroniza o bundle com o projeto Android
npm run cap:android  # abre Android Studio
```
Nunca buildar o APK direto pelo Android Studio sem antes rodar `npm run build` — o APK usará o bundle JS antigo.

### Detecção de plataforma em componentes compartilhados
```js
const isDesktop = typeof window !== 'undefined' && !!window.api
```
`window.api` só existe no Electron. Usado em `CommentSection.jsx` para mostrar menu câmera/galeria apenas no mobile.

### Safe area (notch/câmera/status bar)
- `StatusBar.overlaysWebView: true` no `capacitor.config.json` — webview ocupa tela inteira
- `env(safe-area-inset-top)` pode retornar `0` nos primeiros frames (timing issue)
- Solução: `mobile/src/App.jsx` mede o inset via DOM com retry de 50ms e seta `--safe-top` como CSS variable
- CSS usa `var(--safe-top, env(safe-area-inset-top))` em vez de `env()` diretamente

### Teclado virtual nos modais
- `AndroidManifest.xml` tem `windowSoftInputMode="adjustResize"`
- `mobile/src/App.jsx` escuta `window.visualViewport.resize` e seta `--keyboard-height`
- `.modal-overlay` no mobile aplica `padding-bottom: var(--keyboard-height, 0px)` para empurrar o modal acima do teclado

## Observações importantes

- `mobile/mobile-bundle.zip` está no `.gitignore` (artefato de build, não deve subir)
- `firebase-service-account.json` está no `.gitignore` (credenciais de admin — NUNCA commitar)
- `release.ps1` está no `.gitignore` (contém token de escrita — NUNCA commitar)
- Ao rodar `npm run build` no mobile, o plugin Vite substitui `src/renderer/src/api/index.js` pela versão mobile automaticamente
- A anon key do Supabase está hardcoded no código (é pública por design — não é segredo)
