import crypto from 'node:crypto'
import { getDB } from './firebase.js'

const CLIENT_MANAGER_DEPTS = ['Administrativo', 'Comercial', 'Financeiro']
const TRASH_RETENTION_DAYS = 3

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'cromel-salt').digest('hex')
}

export function randomId() {
  return crypto.randomUUID()
}

// ─── SESSION (em memória — não precisa persistir no Firebase) ─────────
let _currentUser = null

export function getCurrentUser() {
  return _currentUser
}

export function clearSession() {
  _currentUser = null
}

// ─── INIT ─────────────────────────────────────────────────────────────
export async function initDB() {
  const db = getDB()
  const snapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get()
  if (snapshot.empty) {
    const id = randomId()
    await db
      .collection('users')
      .doc(id)
      .set({
        username: 'admin',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        departments: [],
        photo: null,
        createdAt: new Date().toISOString()
      })
    console.log('Usuário admin criado no Firestore com senha padrão: admin123')
    console.log('Troque a senha assim que fizer login pela primeira vez!')
  } else {
    console.log('Banco de dados Firebase inicializado.')
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────
export async function loginUser(username, password) {
  const db = getDB()
  const snapshot = await db.collection('users').get()
  const doc = snapshot.docs.find(
    (d) => d.data().username.toLowerCase() === username.toLowerCase()
  )
  if (!doc) throw new Error('Usuário ou senha incorretos.')
  const user = { id: doc.id, ...doc.data() }
  if (user.passwordHash !== hashPassword(password)) throw new Error('Usuário ou senha incorretos.')
  _currentUser = user
  const { passwordHash, ...safe } = user
  return safe
}

// ─── SESSION / USUÁRIO ATUAL ───────────────────────────────────────────
export async function getUserById(id) {
  const db = getDB()
  const doc = await db.collection('users').doc(id).get()
  if (!doc.exists) return null
  const { passwordHash, ...safe } = { id: doc.id, ...doc.data() }
  return safe
}

// ─── USERS ────────────────────────────────────────────────────────────
export async function listUsers() {
  const db = getDB()
  const snapshot = await db.collection('users').get()
  return snapshot.docs.map((doc) => {
    const { passwordHash, ...safe } = { id: doc.id, ...doc.data() }
    return safe
  })
}

export async function listUsersBasic() {
  const db = getDB()
  const snapshot = await db.collection('users').get()
  return snapshot.docs.map((doc) => {
    const u = doc.data()
    return {
      id: doc.id,
      username: u.username,
      photo: u.photo || null,
      departments: u.departments || [],
      role: u.role
    }
  })
}

export async function createUser({ username, password, departments }) {
  const db = getDB()
  const allSnapshot = await db.collection('users').get()
  const existing = allSnapshot.docs.find(
    (d) => d.data().username.toLowerCase() === username.toLowerCase()
  )
  if (existing) throw new Error('Nome de usuário já existe.')
  const id = randomId()
  const user = {
    username: username.trim(),
    passwordHash: hashPassword(password),
    role: 'user',
    departments: Array.isArray(departments) ? departments : [],
    photo: null,
    createdAt: new Date().toISOString()
  }
  await db.collection('users').doc(id).set(user)
  return { id, ...user }
}

export async function updateUser(id, { username, password, departments }) {
  const db = getDB()
  const docRef = db.collection('users').doc(id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Usuário não encontrado.')
  const user = doc.data()
  const updates = {}
  if (username && username !== user.username) {
    const allSnapshot = await db.collection('users').get()
    const dup = allSnapshot.docs.find(
      (d) => d.id !== id && d.data().username.toLowerCase() === username.toLowerCase()
    )
    if (dup) throw new Error('Nome de usuário já existe.')
    updates.username = username.trim()
  }
  if (password) {
    updates.passwordHash = hashPassword(password)
  }
  if (departments !== undefined) {
    updates.departments = Array.isArray(departments) ? departments : []
  }
  await docRef.update(updates)
  const { passwordHash, ...safe } = { id, ...user, ...updates }
  return safe
}

export async function deleteUser(id) {
  const db = getDB()
  const doc = await db.collection('users').doc(id).get()
  if (!doc.exists) throw new Error('Usuário não encontrado.')
  if (doc.data().role === 'admin') throw new Error('Não é possível excluir o administrador.')
  await db.collection('users').doc(id).delete()
  // Desassociar tarefas
  const tasksSnapshot = await db.collection('tasks').where('assignedTo', '==', id).get()
  const batch = db.batch()
  tasksSnapshot.docs.forEach((d) => batch.update(d.ref, { assignedTo: null }))
  if (!tasksSnapshot.empty) await batch.commit()
  return { id }
}

// ─── TASKS ────────────────────────────────────────────────────────────
export async function listTasks(callerUser, filters = {}) {
  const db = getDB()
  const snapshot = await db.collection('tasks').get()
  let tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  const isClientManager = callerUser.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))

  if (callerUser.role === 'admin') {
    if (filters.department) tasks = tasks.filter((t) => t.department === filters.department)
  } else if (!isClientManager) {
    tasks = tasks.filter((t) => callerUser.departments.includes(t.department))
  }

  if (filters.status) tasks = tasks.filter((t) => t.status === filters.status)
  if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority)
  if (filters.clientId) tasks = tasks.filter((t) => t.clientId === filters.clientId)
  if (filters.serviceId) tasks = tasks.filter((t) => t.serviceId === filters.serviceId)

  return tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function createTask(callerUser, taskData) {
  const db = getDB()
  const now = new Date().toISOString()
  const id = randomId()
  const task = {
    title: taskData.title.trim(),
    description: taskData.description?.trim() || '',
    status: taskData.status || 'pendente',
    priority: taskData.priority || 'media',
    department: taskData.department,
    createdBy: callerUser.id,
    assignedTo: taskData.assignedTo || null,
    dueDate: taskData.dueDate || null,
    clientId: taskData.clientId || null,
    serviceId: taskData.serviceId || null,
    completedAt: null,
    archived: false,
    comments: [],
    createdAt: now,
    updatedAt: now
  }
  await db.collection('tasks').doc(id).set(task)
  return { id, ...task }
}

export async function archiveTask(callerUser, id) {
  const db = getDB()
  const docRef = db.collection('tasks').doc(id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Tarefa não encontrada.')
  const task = doc.data()
  if (task.status !== 'concluido') throw new Error('Apenas tarefas concluídas podem ser arquivadas.')
  const updatedAt = new Date().toISOString()
  await docRef.update({ archived: true, updatedAt })
  return { id, ...task, archived: true, updatedAt }
}

export async function updateTask(callerUser, id, updates) {
  const db = getDB()
  const docRef = db.collection('tasks').doc(id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Tarefa não encontrada.')
  const task = doc.data()

  if (callerUser.role !== 'admin' && !callerUser.departments.includes(task.department)) {
    throw new Error('Sem permissão para editar tarefas de outro departamento.')
  }

  const now = new Date().toISOString()
  let completedAt = task.completedAt
  if (updates.status === 'concluido' && task.status !== 'concluido') {
    completedAt = now
  } else if (updates.status && updates.status !== 'concluido') {
    completedAt = null
  }

  const safe = { ...updates }
  delete safe.id
  delete safe.createdBy
  delete safe.comments
  delete safe.createdAt

  const updated = { ...safe, completedAt, updatedAt: now }
  await docRef.update(updated)
  return { id, ...task, ...updated }
}

export async function deleteTask(callerUser, id) {
  if (callerUser.role !== 'admin') throw new Error('Apenas administradores podem excluir tarefas.')
  const db = getDB()
  const doc = await db.collection('tasks').doc(id).get()
  if (!doc.exists) throw new Error('Tarefa não encontrada.')
  const task = { id: doc.id, ...doc.data() }
  await db.collection('tasks').doc(id).delete()
  const trashId = randomId()
  await db
    .collection('trash')
    .doc(trashId)
    .set({ type: 'task', data: task, deletedAt: new Date().toISOString(), deletedBy: callerUser.id })
  return { id }
}

export async function addComment(callerUser, taskId, text) {
  if (!text || !text.trim()) throw new Error('Comentário não pode ser vazio.')
  const db = getDB()
  const docRef = db.collection('tasks').doc(taskId)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Tarefa não encontrada.')
  const task = doc.data()

  if (callerUser.role !== 'admin' && !callerUser.departments.includes(task.department)) {
    throw new Error('Sem permissão para comentar nesta tarefa.')
  }

  const comment = {
    id: randomId(),
    userId: callerUser.id,
    username: callerUser.username,
    text: text.trim(),
    createdAt: new Date().toISOString()
  }
  const comments = [...(task.comments || []), comment]
  await docRef.update({ comments, updatedAt: new Date().toISOString() })
  return comment
}

// ─── CLIENTS ──────────────────────────────────────────────────────────
function requireClientPermission(callerUser) {
  if (callerUser.role === 'admin') return
  if (!callerUser.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))) {
    throw new Error('Sem permissão para gerenciar clientes.')
  }
}

export async function listClients(callerUser) {
  const db = getDB()
  const snapshot = await db.collection('clients').get()
  const clients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  return clients.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function getClientById(callerUser, id) {
  const db = getDB()
  const doc = await db.collection('clients').doc(id).get()
  if (!doc.exists) throw new Error('Cliente não encontrado.')
  return { id: doc.id, ...doc.data() }
}

export async function createClient(callerUser, data) {
  requireClientPermission(callerUser)
  if (!data.nome || !data.nome.trim()) throw new Error('Nome do cliente é obrigatório.')
  const db = getDB()
  const now = new Date().toISOString()
  const id = randomId()
  const client = {
    nome: data.nome.trim(),
    dadosObra: data.dadosObra?.trim() || '',
    orc: data.orc?.trim() || '',
    tipoObra: data.tipoObra || '',
    createdBy: callerUser.id,
    createdAt: now,
    updatedAt: now
  }
  await db.collection('clients').doc(id).set(client)
  return { id, ...client }
}

export async function updateClient(callerUser, id, updates) {
  requireClientPermission(callerUser)
  const db = getDB()
  const docRef = db.collection('clients').doc(id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Cliente não encontrado.')
  const safe = {}
  if (updates.nome !== undefined) safe.nome = updates.nome.trim()
  if (updates.dadosObra !== undefined) safe.dadosObra = updates.dadosObra.trim()
  if (updates.orc !== undefined) safe.orc = updates.orc.trim()
  if (updates.tipoObra !== undefined) safe.tipoObra = updates.tipoObra
  safe.updatedAt = new Date().toISOString()
  await docRef.update(safe)
  return { id, ...doc.data(), ...safe }
}

export async function deleteClient(callerUser, id) {
  requireClientPermission(callerUser)
  const db = getDB()
  const doc = await db.collection('clients').doc(id).get()
  if (!doc.exists) throw new Error('Cliente não encontrado.')
  const client = { id: doc.id, ...doc.data() }
  const now = new Date().toISOString()

  const [servicesSnap, tasksSnap] = await Promise.all([
    db.collection('services').where('clientId', '==', id).get(),
    db.collection('tasks').where('clientId', '==', id).get()
  ])
  const relatedServices = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const relatedTasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const trashId = randomId()
  const batch = db.batch()
  batch.set(db.collection('trash').doc(trashId), {
    type: 'client',
    data: client,
    relatedServices,
    relatedTasks,
    deletedAt: now,
    deletedBy: callerUser.id
  })
  batch.delete(db.collection('clients').doc(id))
  servicesSnap.docs.forEach((d) => batch.delete(d.ref))
  tasksSnap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return { id }
}

// ─── SERVICES ─────────────────────────────────────────────────────────
export async function listServices(callerUser, clientId) {
  const db = getDB()
  const snapshot = await db.collection('services').where('clientId', '==', clientId).get()
  const services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  return services.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function createService(callerUser, data) {
  requireClientPermission(callerUser)
  if (!data.nome || !data.nome.trim()) throw new Error('Nome do serviço é obrigatório.')
  if (!data.clientId) throw new Error('Cliente é obrigatório.')
  const db = getDB()
  const now = new Date().toISOString()
  const id = randomId()
  const service = {
    clientId: data.clientId,
    nome: data.nome.trim(),
    status: 'ativo',
    createdBy: callerUser.id,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }
  await db.collection('services').doc(id).set(service)
  return { id, ...service }
}

export async function updateService(callerUser, id, updates) {
  requireClientPermission(callerUser)
  const db = getDB()
  const docRef = db.collection('services').doc(id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Serviço não encontrado.')
  const service = doc.data()
  const now = new Date().toISOString()
  const safe = {}
  if (updates.nome !== undefined) safe.nome = updates.nome.trim()
  if (updates.status !== undefined) {
    safe.status = updates.status
    if (updates.status === 'concluido' && service.status !== 'concluido') {
      safe.completedAt = now
    } else if (updates.status === 'ativo') {
      safe.completedAt = null
    }
  }
  safe.updatedAt = now
  await docRef.update(safe)
  return { id, ...service, ...safe }
}

export async function deleteService(callerUser, id) {
  requireClientPermission(callerUser)
  const db = getDB()
  const doc = await db.collection('services').doc(id).get()
  if (!doc.exists) throw new Error('Serviço não encontrado.')
  const service = { id: doc.id, ...doc.data() }
  const now = new Date().toISOString()

  const tasksSnap = await db.collection('tasks').where('serviceId', '==', id).get()
  const relatedTasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const trashId = randomId()
  const batch = db.batch()
  batch.set(db.collection('trash').doc(trashId), {
    type: 'service',
    data: service,
    relatedTasks,
    deletedAt: now,
    deletedBy: callerUser.id
  })
  batch.delete(db.collection('services').doc(id))
  tasksSnap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return { id }
}

// ─── TRASH ────────────────────────────────────────────────────────────
export async function listTrash(callerUser) {
  if (callerUser.role !== 'admin') throw new Error('Apenas administradores podem ver a lixeira.')
  const db = getDB()
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const snapshot = await db.collection('trash').get()

  // Purgar itens expirados
  const expired = snapshot.docs.filter((d) => d.data().deletedAt < cutoff)
  if (expired.length > 0) {
    const batch = db.batch()
    expired.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  const active = snapshot.docs
    .filter((d) => d.data().deletedAt >= cutoff)
    .map((doc) => ({ id: doc.id, ...doc.data() }))

  return active.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
}

export async function restoreTrash(callerUser, trashId) {
  if (callerUser.role !== 'admin') throw new Error('Apenas administradores podem restaurar itens.')
  const db = getDB()
  const trashDoc = await db.collection('trash').doc(trashId).get()
  if (!trashDoc.exists) throw new Error('Item não encontrado na lixeira.')
  const item = trashDoc.data()

  const batch = db.batch()
  if (item.type === 'client') {
    batch.set(db.collection('clients').doc(item.data.id), item.data)
    ;(item.relatedServices || []).forEach((s) =>
      batch.set(db.collection('services').doc(s.id), s)
    )
    ;(item.relatedTasks || []).forEach((t) => batch.set(db.collection('tasks').doc(t.id), t))
  } else if (item.type === 'service') {
    batch.set(db.collection('services').doc(item.data.id), item.data)
    ;(item.relatedTasks || []).forEach((t) => batch.set(db.collection('tasks').doc(t.id), t))
  } else if (item.type === 'task') {
    batch.set(db.collection('tasks').doc(item.data.id), item.data)
  }
  batch.delete(db.collection('trash').doc(trashId))
  await batch.commit()
  return { restored: true }
}

// ─── PROFILE ──────────────────────────────────────────────────────────
export async function updateProfile(callerUser, { photo, password }) {
  const db = getDB()
  const docRef = db.collection('users').doc(callerUser.id)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Usuário não encontrado.')
  const updates = {}
  if (photo !== undefined) updates.photo = photo
  if (password) updates.passwordHash = hashPassword(password)
  await docRef.update(updates)
  // Atualizar sessão em memória
  _currentUser = { ..._currentUser, ...updates }
  const { passwordHash, ...safe } = { ...doc.data(), ...updates, id: callerUser.id }
  return safe
}
