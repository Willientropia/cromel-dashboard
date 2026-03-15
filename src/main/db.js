import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DB_PATH = path.join(app.getPath('userData'), 'cromel-db.json')

const DEFAULT_DB = {
  users: [],
  tasks: [],
  clients: [],
  services: [],
  trash: [],
  session: { userId: null }
}

const CLIENT_MANAGER_DEPTS = ['Administrativo', 'Comercial', 'Financeiro']
const TRASH_RETENTION_DAYS = 3

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'cromel-salt').digest('hex')
}

export function randomId() {
  return crypto.randomUUID()
}

function migrateDB(data) {
  if (!data.clients) data.clients = []
  if (!data.services) data.services = []
  if (!data.trash) data.trash = []

  // Migrate users: department (string) -> departments (array)
  data.users = data.users.map((u) => {
    if ('department' in u && !('departments' in u)) {
      const departments = u.department ? [u.department] : []
      const { department, ...rest } = u
      return { ...rest, departments }
    }
    return u
  })

  // Migrate tasks: ensure new fields exist
  data.tasks = data.tasks.map((t) => {
    const updates = {}
    if (!('clientId' in t)) updates.clientId = null
    if (!('serviceId' in t)) updates.serviceId = null
    if (!('completedAt' in t)) {
      updates.completedAt = t.status === 'concluido' ? (t.updatedAt || t.createdAt) : null
    }
    if (!('archived' in t)) updates.archived = false
    return Object.keys(updates).length > 0 ? { ...t, ...updates } : t
  })

  // Migrate clients: old fields -> new fields
  data.clients = data.clients.map((c) => {
    if ('cidade' in c && !('dadosObra' in c)) {
      const dadosObra = [c.cidade, c.endereco].filter(Boolean).join(', ')
      const { cidade, empresa, telefone, endereco, ...rest } = c
      return { ...rest, dadosObra, orc: '', tipoObra: '' }
    }
    return c
  })

  return data
}

// Auto-purge trash items older than TRASH_RETENTION_DAYS
function purgeExpiredTrash(db) {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const before = db.trash.length
  db.trash = db.trash.filter((item) => new Date(item.deletedAt).getTime() > cutoff)
  return db.trash.length !== before
}

export function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    const data = JSON.parse(raw)
    const migrated = migrateDB({
      users: data.users || [],
      tasks: data.tasks || [],
      clients: data.clients || [],
      services: data.services || [],
      trash: data.trash || [],
      session: data.session || { userId: null }
    })
    // Purge expired trash on read
    if (purgeExpiredTrash(migrated)) {
      try { fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), 'utf-8') } catch {}
    }
    return migrated
  } catch {
    return { ...DEFAULT_DB }
  }
}

export function writeDB(data) {
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write DB:', err)
    throw err
  }
}

export function initDB() {
  const db = readDB()
  if (db.users.length === 0) {
    db.users.push({
      id: randomId(),
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      departments: [],
      createdAt: new Date().toISOString()
    })
    writeDB(db)
    console.log('DB seeded with admin user.')
  }
  console.log('DB initialized at:', DB_PATH)
}

// ─── SESSION ──────────────────────────────────────────────────────────
export function getSession() {
  const db = readDB()
  return db.session
}

export function setSession(userId) {
  const db = readDB()
  db.session = { userId }
  writeDB(db)
}

export function clearSession() {
  const db = readDB()
  db.session = { userId: null }
  writeDB(db)
}

export function getCurrentUser() {
  const db = readDB()
  const { userId } = db.session
  if (!userId) return null
  return db.users.find((u) => u.id === userId) || null
}

// ─── USERS ────────────────────────────────────────────────────────────
export function listUsers() {
  const db = readDB()
  return db.users.map(({ passwordHash, ...u }) => u)
}

export function listUsersBasic() {
  const db = readDB()
  return db.users.map((u) => ({
    id: u.id,
    username: u.username,
    photo: u.photo || null,
    departments: u.departments || [],
    role: u.role
  }))
}

export function getUserById(id) {
  const db = readDB()
  const user = db.users.find((u) => u.id === id)
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}

export function createUser({ username, password, departments }) {
  const db = readDB()
  if (db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Nome de usuário já existe.')
  }
  const user = {
    id: randomId(),
    username: username.trim(),
    passwordHash: hashPassword(password),
    plainPassword: password,
    role: 'user',
    departments: Array.isArray(departments) ? departments : [],
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  writeDB(db)
  const { passwordHash: _h, ...safe } = user
  return safe
}

export function updateUser(id, { username, password, departments }) {
  const db = readDB()
  const idx = db.users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error('Usuário não encontrado.')
  const user = db.users[idx]
  if (username && username !== user.username) {
    const dup = db.users.find((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())
    if (dup) throw new Error('Nome de usuário já existe.')
    user.username = username.trim()
  }
  if (password) {
    user.passwordHash = hashPassword(password)
    user.plainPassword = password
  }
  if (departments !== undefined) {
    user.departments = Array.isArray(departments) ? departments : []
  }
  db.users[idx] = user
  writeDB(db)
  const { passwordHash: _h, ...safe } = user
  return safe
}

export function deleteUser(id) {
  const db = readDB()
  const idx = db.users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error('Usuário não encontrado.')
  if (db.users[idx].role === 'admin') throw new Error('Não é possível excluir o administrador.')
  db.users.splice(idx, 1)
  db.tasks = db.tasks.map((t) => (t.assignedTo === id ? { ...t, assignedTo: null } : t))
  writeDB(db)
  return { id }
}

export function loginUser(username, password) {
  const db = readDB()
  const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) throw new Error('Usuário ou senha incorretos.')
  if (user.passwordHash !== hashPassword(password)) throw new Error('Usuário ou senha incorretos.')
  setSession(user.id)
  const { passwordHash, ...safe } = user
  return safe
}

// ─── TASKS ────────────────────────────────────────────────────────────
export function listTasks(callerUser, filters = {}) {
  const db = readDB()
  let tasks = db.tasks

  if (callerUser.role !== 'admin') {
    tasks = tasks.filter((t) => callerUser.departments.includes(t.department))
  } else if (filters.department) {
    tasks = tasks.filter((t) => t.department === filters.department)
  }

  if (filters.status) tasks = tasks.filter((t) => t.status === filters.status)
  if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority)
  if (filters.clientId) tasks = tasks.filter((t) => t.clientId === filters.clientId)
  if (filters.serviceId) tasks = tasks.filter((t) => t.serviceId === filters.serviceId)

  return tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function createTask(callerUser, taskData) {
  const db = readDB()
  const now = new Date().toISOString()
  const task = {
    id: randomId(),
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
  db.tasks.push(task)
  writeDB(db)
  return task
}

export function archiveTask(callerUser, id) {
  const db = readDB()
  const idx = db.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Tarefa não encontrada.')
  const task = db.tasks[idx]
  if (task.status !== 'concluido') throw new Error('Apenas tarefas concluídas podem ser arquivadas.')
  task.archived = true
  task.updatedAt = new Date().toISOString()
  db.tasks[idx] = task
  writeDB(db)
  return task
}

export function updateTask(callerUser, id, updates) {
  const db = readDB()
  const idx = db.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Tarefa não encontrada.')

  const task = db.tasks[idx]
  if (callerUser.role !== 'admin' && !callerUser.departments.includes(task.department)) {
    throw new Error('Sem permissão para editar tarefas de outro departamento.')
  }

  const now = new Date().toISOString()
  // Track completedAt
  let completedAt = task.completedAt
  if (updates.status === 'concluido' && task.status !== 'concluido') {
    completedAt = now
  } else if (updates.status && updates.status !== 'concluido') {
    completedAt = null
  }

  const updated = {
    ...task,
    ...updates,
    id: task.id,
    createdBy: task.createdBy,
    comments: task.comments,
    createdAt: task.createdAt,
    completedAt,
    updatedAt: now
  }
  db.tasks[idx] = updated
  writeDB(db)
  return updated
}

export function deleteTask(callerUser, id) {
  if (callerUser.role !== 'admin') {
    throw new Error('Apenas administradores podem excluir tarefas.')
  }
  const db = readDB()
  const idx = db.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Tarefa não encontrada.')
  const task = db.tasks[idx]
  db.tasks.splice(idx, 1)
  // Move to trash
  db.trash.push({ type: 'task', data: task, deletedAt: new Date().toISOString(), deletedBy: callerUser.id })
  writeDB(db)
  return { id }
}

export function addComment(callerUser, taskId, text) {
  if (!text || !text.trim()) throw new Error('Comentário não pode ser vazio.')
  const db = readDB()
  const idx = db.tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) throw new Error('Tarefa não encontrada.')
  const task = db.tasks[idx]
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
  task.comments.push(comment)
  task.updatedAt = new Date().toISOString()
  db.tasks[idx] = task
  writeDB(db)
  return comment
}

// ─── CLIENTS ──────────────────────────────────────────────────────────
function requireClientPermission(callerUser) {
  if (callerUser.role === 'admin') return
  if (!callerUser.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))) {
    throw new Error('Sem permissao para gerenciar clientes.')
  }
}

export function listClients(callerUser) {
  const db = readDB()
  return db.clients.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function getClientById(callerUser, id) {
  const db = readDB()
  const client = db.clients.find((c) => c.id === id)
  if (!client) throw new Error('Cliente nao encontrado.')
  return client
}

export function createClient(callerUser, data) {
  requireClientPermission(callerUser)
  if (!data.nome || !data.nome.trim()) throw new Error('Nome do cliente e obrigatorio.')
  const db = readDB()
  const now = new Date().toISOString()
  const client = {
    id: randomId(),
    nome: data.nome.trim(),
    dadosObra: data.dadosObra?.trim() || '',
    orc: data.orc?.trim() || '',
    tipoObra: data.tipoObra || '',
    createdBy: callerUser.id,
    createdAt: now,
    updatedAt: now
  }
  db.clients.push(client)
  writeDB(db)
  return client
}

export function updateClient(callerUser, id, updates) {
  requireClientPermission(callerUser)
  const db = readDB()
  const idx = db.clients.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('Cliente nao encontrado.')
  const client = db.clients[idx]
  const safe = {}
  if (updates.nome !== undefined) safe.nome = updates.nome.trim()
  if (updates.dadosObra !== undefined) safe.dadosObra = updates.dadosObra.trim()
  if (updates.orc !== undefined) safe.orc = updates.orc.trim()
  if (updates.tipoObra !== undefined) safe.tipoObra = updates.tipoObra
  const updated = { ...client, ...safe, updatedAt: new Date().toISOString() }
  db.clients[idx] = updated
  writeDB(db)
  return updated
}

export function deleteClient(callerUser, id) {
  requireClientPermission(callerUser)
  const db = readDB()
  const idx = db.clients.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('Cliente nao encontrado.')
  const client = db.clients[idx]
  const now = new Date().toISOString()
  // Gather related services and tasks
  const relatedServices = db.services.filter((s) => s.clientId === id)
  const relatedTasks = db.tasks.filter((t) => t.clientId === id)
  // Move to trash
  db.trash.push({ type: 'client', data: client, relatedServices, relatedTasks, deletedAt: now, deletedBy: callerUser.id })
  // Remove from active data
  db.clients.splice(idx, 1)
  db.services = db.services.filter((s) => s.clientId !== id)
  db.tasks = db.tasks.filter((t) => t.clientId !== id)
  writeDB(db)
  return { id }
}

// ─── SERVICES ─────────────────────────────────────────────────────────
export function listServices(callerUser, clientId) {
  const db = readDB()
  return db.services
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function createService(callerUser, data) {
  requireClientPermission(callerUser)
  if (!data.nome || !data.nome.trim()) throw new Error('Nome do servico e obrigatorio.')
  if (!data.clientId) throw new Error('Cliente e obrigatorio.')
  const db = readDB()
  const now = new Date().toISOString()
  const service = {
    id: randomId(),
    clientId: data.clientId,
    nome: data.nome.trim(),
    status: 'ativo',
    createdBy: callerUser.id,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }
  db.services.push(service)
  writeDB(db)
  return service
}

export function updateService(callerUser, id, updates) {
  requireClientPermission(callerUser)
  const db = readDB()
  const idx = db.services.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Servico nao encontrado.')
  const service = db.services[idx]
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
  const updated = { ...service, ...safe, updatedAt: now }
  db.services[idx] = updated
  writeDB(db)
  return updated
}

export function deleteService(callerUser, id) {
  requireClientPermission(callerUser)
  const db = readDB()
  const idx = db.services.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Servico nao encontrado.')
  const service = db.services[idx]
  const now = new Date().toISOString()
  const relatedTasks = db.tasks.filter((t) => t.serviceId === id)
  db.trash.push({ type: 'service', data: service, relatedTasks, deletedAt: now, deletedBy: callerUser.id })
  db.services.splice(idx, 1)
  db.tasks = db.tasks.filter((t) => t.serviceId !== id)
  writeDB(db)
  return { id }
}

// ─── TRASH ────────────────────────────────────────────────────────────
export function listTrash(callerUser) {
  if (callerUser.role !== 'admin') throw new Error('Apenas administradores podem ver a lixeira.')
  const db = readDB()
  return db.trash.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
}

export function restoreTrash(callerUser, trashIndex) {
  if (callerUser.role !== 'admin') throw new Error('Apenas administradores podem restaurar itens.')
  const db = readDB()
  if (trashIndex < 0 || trashIndex >= db.trash.length) throw new Error('Item nao encontrado na lixeira.')
  const item = db.trash[trashIndex]
  if (item.type === 'client') {
    db.clients.push(item.data)
    if (item.relatedServices) db.services.push(...item.relatedServices)
    if (item.relatedTasks) db.tasks.push(...item.relatedTasks)
  } else if (item.type === 'service') {
    db.services.push(item.data)
    if (item.relatedTasks) db.tasks.push(...item.relatedTasks)
  } else if (item.type === 'task') {
    db.tasks.push(item.data)
  }
  db.trash.splice(trashIndex, 1)
  writeDB(db)
  return { restored: true }
}

// --- PROFILE ---
export function updateProfile(callerUser, { photo, password }) {
  const db = readDB()
  const idx = db.users.findIndex((u) => u.id === callerUser.id)
  if (idx === -1) throw new Error('Usuario nao encontrado.')
  const user = db.users[idx]
  if (photo !== undefined) user.photo = photo
  if (password) {
    user.passwordHash = hashPassword(password)
    user.plainPassword = password
  }
  db.users[idx] = user
  writeDB(db)
  const { passwordHash: _h, ...safe } = user
  return safe
}
