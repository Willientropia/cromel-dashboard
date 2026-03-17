/**
 * API layer — mobile (Capacitor + Firebase Web SDK)
 * Mesmos métodos que o desktop expõe via window.api,
 * mas chama o Firestore diretamente sem IPC.
 */
import pkg from '../../package.json'
import { onUpdateAvailable as _onUpdateAvailable } from '../updater'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'cromel-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function ok(data) {
  return { success: true, data }
}

function err(error) {
  return { success: false, error: error?.message || String(error) }
}

function wrap(fn) {
  return async (...args) => {
    try {
      return ok(await fn(...args))
    } catch (e) {
      return err(e)
    }
  }
}

// Sessão em memória (igual ao desktop)
let _currentUser = null

function requireAuth() {
  if (!_currentUser) throw new Error('Não autenticado.')
  return _currentUser
}

function requireAdmin() {
  const user = requireAuth()
  if (user.role !== 'admin') throw new Error('Acesso restrito ao administrador.')
  return user
}

function docToObj(snap) {
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

function snapToList(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

async function _login(username, password) {
  const snap = await getDocs(collection(db, 'users'))
  const doc = snap.docs.find(
    (d) => d.data().username?.toLowerCase() === username.toLowerCase()
  )
  if (!doc) throw new Error('Usuário ou senha incorretos.')
  const user = { id: doc.id, ...doc.data() }
  const hash = await hashPassword(password)
  if (user.passwordHash !== hash) throw new Error('Usuário ou senha incorretos.')
  _currentUser = user
  const { passwordHash, ...safe } = user
  // Persiste sessão no localStorage para sobreviver a refreshes
  localStorage.setItem('cromel_session', JSON.stringify(safe))
  return safe
}

async function _logout() {
  _currentUser = null
  localStorage.removeItem('cromel_session')
  return null
}

async function _getSession() {
  if (_currentUser) {
    const { passwordHash, ...safe } = _currentUser
    return safe
  }
  const stored = localStorage.getItem('cromel_session')
  if (!stored) return null
  const session = JSON.parse(stored)
  // Revalida se o usuário ainda existe no Firestore
  const snap = await getDoc(doc(db, 'users', session.id))
  if (!snap.exists()) {
    localStorage.removeItem('cromel_session')
    return null
  }
  const { passwordHash, ...safe } = { id: snap.id, ...snap.data() }
  _currentUser = { id: snap.id, ...snap.data() }
  return safe
}

// ─── USERS ─────────────────────────────────────────────────────────────────────

async function _listUsersBasic() {
  requireAuth()
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({
    id: d.id,
    username: d.data().username,
    departments: d.data().departments || [],
    role: d.data().role,
    photo: d.data().photo || null
  }))
}

async function _listUsers() {
  requireAdmin()
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => {
    const { passwordHash, ...safe } = { id: d.id, ...d.data() }
    return safe
  })
}

async function _createUser({ username, password, departments }) {
  requireAdmin()
  const hash = await hashPassword(password)
  const ref = await addDoc(collection(db, 'users'), {
    username,
    passwordHash: hash,
    plainPassword: password,
    role: 'user',
    departments: departments || [],
    photo: null,
    createdAt: new Date().toISOString()
  })
  const snap = await getDoc(ref)
  const { passwordHash, ...safe } = { id: snap.id, ...snap.data() }
  return safe
}

async function _updateUser(id, data) {
  requireAdmin()
  const updates = { ...data }
  if (data.password) {
    updates.passwordHash = await hashPassword(data.password)
    updates.plainPassword = data.password
    delete updates.password
  }
  await updateDoc(doc(db, 'users', id), updates)
  const snap = await getDoc(doc(db, 'users', id))
  const { passwordHash, ...safe } = { id: snap.id, ...snap.data() }
  return safe
}

async function _deleteUser(id) {
  requireAdmin()
  await deleteDoc(doc(db, 'users', id))
  return null
}

// ─── TASKS ─────────────────────────────────────────────────────────────────────

async function _listTasks() {
  const user = requireAuth()
  const snap = await getDocs(collection(db, 'tasks'))
  let tasks = snapToList(snap).filter((t) => !t.deleted)
  if (user.role !== 'admin') {
    tasks = tasks.filter(
      (t) => t.department && user.departments?.includes(t.department)
    )
  }
  return tasks
}

async function _createTask(data) {
  const user = requireAuth()
  const payload = {
    ...data,
    createdBy: user.id,
    archived: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: []
  }
  const ref = await addDoc(collection(db, 'tasks'), payload)
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() }
}

async function _updateTask(id, updates) {
  requireAuth()
  const taskRef = doc(db, 'tasks', id)
  await updateDoc(taskRef, { ...updates, updatedAt: new Date().toISOString() })
  const snap = await getDoc(taskRef)
  return { id: snap.id, ...snap.data() }
}

async function _deleteTask(id) {
  requireAdmin()
  const snap = await getDoc(doc(db, 'tasks', id))
  if (!snap.exists()) throw new Error('Tarefa não encontrada.')
  await addDoc(collection(db, 'trash'), {
    type: 'task',
    item: { id, ...snap.data() },
    deletedAt: new Date().toISOString()
  })
  await deleteDoc(doc(db, 'tasks', id))
  return null
}

async function _archiveTask(id) {
  requireAuth()
  const taskRef = doc(db, 'tasks', id)
  await updateDoc(taskRef, { archived: true, updatedAt: new Date().toISOString() })
  return null
}

async function _addComment(taskId, text) {
  const user = requireAuth()
  const comment = {
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    text,
    createdAt: new Date().toISOString()
  }
  const taskRef = doc(db, 'tasks', taskId)
  const snap = await getDoc(taskRef)
  if (!snap.exists()) throw new Error('Tarefa não encontrada.')
  const comments = snap.data().comments || []
  await updateDoc(taskRef, { comments: [...comments, comment] })
  return comment
}

// ─── CLIENTS ───────────────────────────────────────────────────────────────────

async function _listClients() {
  requireAuth()
  const snap = await getDocs(collection(db, 'clients'))
  return snapToList(snap).filter((c) => !c.deleted)
}

async function _getClient(id) {
  requireAuth()
  const snap = await getDoc(doc(db, 'clients', id))
  return docToObj(snap)
}

async function _createClient(data) {
  const user = requireAuth()
  const payload = {
    ...data,
    createdBy: user.id,
    deleted: false,
    createdAt: new Date().toISOString()
  }
  const ref = await addDoc(collection(db, 'clients'), payload)
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() }
}

async function _updateClient(id, data) {
  requireAuth()
  await updateDoc(doc(db, 'clients', id), data)
  const snap = await getDoc(doc(db, 'clients', id))
  return { id: snap.id, ...snap.data() }
}

async function _deleteClient(id) {
  requireAuth()
  const snap = await getDoc(doc(db, 'clients', id))
  if (!snap.exists()) throw new Error('Cliente não encontrado.')
  await addDoc(collection(db, 'trash'), {
    type: 'client',
    item: { id, ...snap.data() },
    deletedAt: new Date().toISOString()
  })
  await deleteDoc(doc(db, 'clients', id))
  return null
}

// ─── SERVICES ──────────────────────────────────────────────────────────────────

async function _listServices(clientId) {
  requireAuth()
  const q = query(collection(db, 'services'), where('clientId', '==', clientId))
  const snap = await getDocs(q)
  return snapToList(snap).filter((s) => !s.deleted)
}

async function _createService({ clientId, nome }) {
  const user = requireAuth()
  const ref = await addDoc(collection(db, 'services'), {
    clientId,
    nome,
    status: 'ativo',
    deleted: false,
    createdBy: user.id,
    createdAt: new Date().toISOString()
  })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() }
}

async function _updateService(id, data) {
  requireAuth()
  await updateDoc(doc(db, 'services', id), data)
  const snap = await getDoc(doc(db, 'services', id))
  return { id: snap.id, ...snap.data() }
}

async function _deleteService(id) {
  requireAuth()
  const snap = await getDoc(doc(db, 'services', id))
  if (!snap.exists()) throw new Error('Serviço não encontrado.')
  await addDoc(collection(db, 'trash'), {
    type: 'service',
    item: { id, ...snap.data() },
    deletedAt: new Date().toISOString()
  })
  await deleteDoc(doc(db, 'services', id))
  return null
}

// ─── TRASH ─────────────────────────────────────────────────────────────────────

async function _listTrash() {
  requireAdmin()
  const snap = await getDocs(collection(db, 'trash'))
  return snapToList(snap)
}

async function _restoreTrash(id) {
  requireAdmin()
  const snap = await getDoc(doc(db, 'trash', id))
  if (!snap.exists()) throw new Error('Item não encontrado na lixeira.')
  const entry = { id: snap.id, ...snap.data() }
  const collectionName = entry.type === 'task' ? 'tasks' : entry.type === 'client' ? 'clients' : 'services'
  const { id: itemId, ...itemData } = entry.item
  await addDoc(collection(db, collectionName), { ...itemData, deleted: false })
  await deleteDoc(doc(db, 'trash', id))
  return null
}

// ─── PROFILE ───────────────────────────────────────────────────────────────────

async function _updateProfile(data) {
  const user = requireAuth()
  const updates = {}
  if (data.photo) updates.photo = data.photo
  if (data.password) {
    updates.passwordHash = await hashPassword(data.password)
    updates.plainPassword = data.password
  }
  await updateDoc(doc(db, 'users', user.id), updates)
  _currentUser = { ..._currentUser, ...updates }
  const stored = localStorage.getItem('cromel_session')
  if (stored) {
    const session = JSON.parse(stored)
    if (data.photo) session.photo = data.photo
    localStorage.setItem('cromel_session', JSON.stringify(session))
  }
  return null
}

// ─── EXPORT (mesma interface que window.api) ───────────────────────────────────

const api = {
  // Auth
  login: wrap(_login),
  logout: wrap(_logout),
  getSession: wrap(_getSession),

  // Users
  listUsersBasic: wrap(_listUsersBasic),
  listUsers: wrap(_listUsers),
  createUser: wrap(_createUser),
  updateUser: (id, data) => wrap(() => _updateUser(id, data))(),
  deleteUser: (id) => wrap(() => _deleteUser(id))(),

  // Tasks
  listTasks: wrap(_listTasks),
  createTask: (data) => wrap(() => _createTask(data))(),
  updateTask: (id, updates) => wrap(() => _updateTask(id, updates))(),
  deleteTask: (id) => wrap(() => _deleteTask(id))(),
  archiveTask: (id) => wrap(() => _archiveTask(id))(),
  addComment: (taskId, text) => wrap(() => _addComment(taskId, text))(),

  // Clients
  listClients: wrap(_listClients),
  getClient: (id) => wrap(() => _getClient(id))(),
  createClient: (data) => wrap(() => _createClient(data))(),
  updateClient: (id, data) => wrap(() => _updateClient(id, data))(),
  deleteClient: (id) => wrap(() => _deleteClient(id))(),

  // Services
  listServices: (clientId) => wrap(() => _listServices(clientId))(),
  createService: (data) => wrap(() => _createService(data))(),
  updateService: (id, data) => wrap(() => _updateService(id, data))(),
  deleteService: (id) => wrap(() => _deleteService(id))(),

  // Trash
  listTrash: wrap(_listTrash),
  restoreTrash: (id) => wrap(() => _restoreTrash(id))(),

  // Profile
  updateProfile: (data) => wrap(() => _updateProfile(data))(),

  // App version — retorna string pura igual ao desktop (não usa ok() wrapper)
  getVersion: async () => pkg.version,
  onUpdateAvailable: (cb) => _onUpdateAvailable(cb, pkg.version)
}

export default api
