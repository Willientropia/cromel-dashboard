import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DB_PATH = path.join(app.getPath('userData'), 'cromel-db.json')

const DEFAULT_DB = {
  users: [],
  tasks: [],
  session: { userId: null }
}

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'cromel-salt').digest('hex')
}

export function randomId() {
  return crypto.randomUUID()
}

export function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return {
      users: data.users || [],
      tasks: data.tasks || [],
      session: data.session || { userId: null }
    }
  } catch {
    return { ...DEFAULT_DB, users: [], tasks: [], session: { userId: null } }
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
      department: null,
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

export function getUserById(id) {
  const db = readDB()
  const user = db.users.find((u) => u.id === id)
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}

export function createUser({ username, password, department }) {
  const db = readDB()

  if (db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Nome de usuário já existe.')
  }

  const user = {
    id: randomId(),
    username: username.trim(),
    passwordHash: hashPassword(password),
    role: 'user',
    department,
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  writeDB(db)

  const { passwordHash, ...safe } = user
  return safe
}

export function updateUser(id, { username, password, department }) {
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
  }

  if (department !== undefined) {
    user.department = department
  }

  db.users[idx] = user
  writeDB(db)

  const { passwordHash, ...safe } = user
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
    tasks = tasks.filter((t) => t.department === callerUser.department)
  } else if (filters.department) {
    tasks = tasks.filter((t) => t.department === filters.department)
  }

  if (filters.status) tasks = tasks.filter((t) => t.status === filters.status)
  if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority)

  return tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function createTask(callerUser, taskData) {
  if (callerUser.role !== 'admin' && taskData.department !== callerUser.department) {
    throw new Error('Sem permissão para criar tarefas em outro departamento.')
  }

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

  if (callerUser.role !== 'admin' && task.department !== callerUser.department) {
    throw new Error('Sem permissão para editar tarefas de outro departamento.')
  }

  // Non-admins cannot change department
  if (callerUser.role !== 'admin') {
    delete updates.department
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
  if (callerUser.role !== 'admin' && task.department !== callerUser.department) {
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
