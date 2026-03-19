import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage as _getAdminStorage } from 'firebase-admin/storage'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// electron-vite injeta __dirname automaticamente no bundle do main process
// Em dev e produção: __dirname aponta para out/main/, então ../../ = raiz do projeto
const SERVICE_ACCOUNT_PATH = join(__dirname, '../../firebase-service-account.json')
const STORAGE_BUCKET = 'cromel-dashboard.firebasestorage.app'

let _db = null

export function initFirebase() {
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(
      `Arquivo de credenciais Firebase não encontrado em: ${SERVICE_ACCOUNT_PATH}\n` +
        'Baixe o arquivo de Service Account no console do Firebase e coloque-o na raiz do projeto.'
    )
  }

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
    initializeApp({ credential: cert(serviceAccount), storageBucket: STORAGE_BUCKET })
  }

  _db = getFirestore()
  console.log('Firebase Firestore inicializado.')
  return _db
}

export function getDB() {
  if (!_db) throw new Error('Firebase não inicializado. Chame initFirebase() primeiro.')
  return _db
}

export function getStorage() {
  return _getAdminStorage()
}
