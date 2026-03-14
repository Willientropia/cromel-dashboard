import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DB_PATH = path.join(app.getPath('userData'), 'cromel-db.json')

const DEFAULT_DB = {
  users: [],
  tasks: [],
  clients: [],
  session: { userId: null }
}

const CLIENT_MANAGER_DEPTS = ['Comercial', 'Financeiro']

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'cromel-salt').digest('hex')
}

export function randomId() {
  return crypto.randomUUID()
}

function migrateDB(data) {
  if (!data.clients) data.clients = []

  // Migrate users: department (string) -> departments (array)
  data.users = data.users.map((u) => {
    if ('department' in u && !('departments' in u)) {
      const departments = u.department ? [u.department] : []
      const { department, ...rest } = u
      return { ...rest, departments }
    }
    return u
  })

  // Migrate tasks: ensure clientId field exists
  data.tasks = data.tasks.map((t) => {
    if (!('clientId' in t)) return { ...t, clientId: null }
    return t
  })

  return data
}

export function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    const data = JSON.parse(raw)
    const migrated = migrateDB({
      users: data.users || [],
      tasks: data.tasks || [],
      clients: data.clients || [],
      session: data.session || { userId: null }
    })
    return migrated
  } catch {
    return { ...DEFAULT_DB, users: [], tasks: [], clients: [], session: { userId: null } }
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
    const dup = db.users.find(
      (u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase()
    )
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
  // Clean up tasks referencing this user
  db.tasks = db.tasks.map((t) => {
    if (t.assignedTo === id) return { ...t, assignedTo: null }
    return t
  })
  writeDB(db)
  return { id }
}

export function loginUser(username, password) {
  const db = readDB()
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  )
  if (!user) throw new Error('Usuário ou senha incorretos.')
  if (user.passwordHash !== hashPassword(password)) {
    throw new Error('Usuário ou senha incorretos.')
  }
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

  return tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function createTask(callerUser, taskData) {
  // Any authenticated user can create tasks for any department
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
    comments: [],
    createdAt: now,
    updatedAt: now
  }
  db.tasks.push(task)
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

  const updated = {
    ...task,
    ...updates,
    id: task.id,
    createdBy: task.createdBy,
    comments: task.comments,
    createdAt: task.createdAt,
    updatedAt: new Date().toISOString()
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
  db.tasks.splice(idx, 1)
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
    cidade: data.cidade?.trim() || '',
    empresa: data.empresa?.trim() || '',
    telefone: data.telefone?.trim() || '',
    endereco: data.endereco?.trim() || '',
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
  if (updates.cidade !== undefined) safe.cidade = updates.cidade.trim()
  if (updates.empresa !== undefined) safe.empresa = updates.empresa.trim()
  if (updates.telefone !== undefined) safe.telefone = updates.telefone.trim()
  if (updates.endereco !== undefined) safe.endereco = updates.endereco.trim()

  const updated = {
    ...client,
    ...safe,
    updatedAt: new Date().toISOString()
  }
  db.clients[idx] = updated
  writeDB(db)
  return updated
}

export function deleteClient(callerUser, id) {
  requireClientPermission(callerUser)

  const db = readDB()
  const idx = db.clients.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('Cliente nao encontrado.')

  db.clients.splice(idx, 1)
  // Orphan tasks: set clientId to null
  db.tasks = db.tasks.map((t) => (t.clientId === id ? { ...t, clientId: null } : t))
  writeDB(db)
  return { id }
}

// --- PROFILE ---
export function updateProfile(callerUser, { photo, password }) {
  const db = readDB()
  const idx = db.users.findIndex((u) => u.id === callerUser.id)
  if (idx === -1) throw new Error('Usuario nao encontrado.')

  const user = db.users[idx]

  if (photo !== undefined) {
    user.photo = photo
  }

  if (password) {
    user.passwordHash = hashPassword(password)
    user.plainPassword = password
  }

  db.users[idx] = user
  writeDB(db)

  const { passwordHash: _h, ...safe } = user
  return safe
}
