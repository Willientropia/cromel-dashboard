import { ipcMain } from 'electron'
import {
  getCurrentUser,
  loginUser,
  clearSession,
  getSession,
  getUserById,
  listUsers,
  listUsersBasic,
  createUser,
  updateUser,
  deleteUser,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  addComment,
  updateProfile,
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  listServices,
  createService,
  updateService,
  deleteService,
  listTrash,
  restoreTrash
} from './db.js'

function wrap(fn) {
  return async (event, ...args) => {
    try {
      const result = await fn(event, ...args)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message || 'Erro interno.' }
    }
  }
}

function requireAuth() {
  const user = getCurrentUser()
  if (!user) throw new Error('Não autenticado.')
  return user
}

function requireAdmin() {
  const user = requireAuth()
  if (user.role !== 'admin') throw new Error('Acesso restrito ao administrador.')
  return user
}

export function registerIpcHandlers() {
  // ─── AUTH ──────────────────────────────────────────────────────────
  ipcMain.handle(
    'auth:login',
    wrap(async (_e, { username, password }) => {
      return loginUser(username, password)
    })
  )

  ipcMain.handle(
    'auth:logout',
    wrap(async () => {
      clearSession()
      return null
    })
  )

  ipcMain.handle(
    'auth:session',
    wrap(async () => {
      const session = getSession()
      if (!session.userId) return null
      return getUserById(session.userId)
    })
  )

  // ─── USERS ─────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:users:list-basic',
    wrap(async () => {
      requireAuth()
      return listUsersBasic()
    })
  )

  ipcMain.handle(
    'db:users:list',
    wrap(async () => {
      requireAdmin()
      return listUsers()
    })
  )

  ipcMain.handle(
    'db:users:create',
    wrap(async (_e, data) => {
      requireAdmin()
      return createUser(data)
    })
  )

  ipcMain.handle(
    'db:users:update',
    wrap(async (_e, { id, ...data }) => {
      requireAdmin()
      return updateUser(id, data)
    })
  )

  ipcMain.handle(
    'db:users:delete',
    wrap(async (_e, { id }) => {
      requireAdmin()
      return deleteUser(id)
    })
  )

  // ─── TASKS ─────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:tasks:list',
    wrap(async (_e, filters) => {
      const user = requireAuth()
      return listTasks(user, filters)
    })
  )

  ipcMain.handle(
    'db:tasks:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return createTask(user, data)
    })
  )

  ipcMain.handle(
    'db:tasks:update',
    wrap(async (_e, { id, ...updates }) => {
      const user = requireAuth()
      return updateTask(user, id, updates)
    })
  )

  ipcMain.handle(
    'db:tasks:delete',
    wrap(async (_e, { id }) => {
      const user = requireAdmin()
      return deleteTask(user, id)
    })
  )

  ipcMain.handle(
    'db:tasks:archive',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return archiveTask(user, id)
    })
  )

  ipcMain.handle(
    'db:tasks:comment',
    wrap(async (_e, { taskId, text }) => {
      const user = requireAuth()
      return addComment(user, taskId, text)
    })
  )

  // ─── CLIENTS ───────────────────────────────────────────────────────
  ipcMain.handle(
    'db:clients:list',
    wrap(async () => {
      const user = requireAuth()
      return listClients(user)
    })
  )

  ipcMain.handle(
    'db:clients:get',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return getClientById(user, id)
    })
  )

  ipcMain.handle(
    'db:clients:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return createClient(user, data)
    })
  )

  ipcMain.handle(
    'db:clients:update',
    wrap(async (_e, { id, ...data }) => {
      const user = requireAuth()
      return updateClient(user, id, data)
    })
  )

  ipcMain.handle(
    'db:clients:delete',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return deleteClient(user, id)
    })
  )

  // ─── SERVICES ──────────────────────────────────────────────────────
  ipcMain.handle(
    'db:services:list',
    wrap(async (_e, { clientId }) => {
      const user = requireAuth()
      return listServices(user, clientId)
    })
  )

  ipcMain.handle(
    'db:services:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return createService(user, data)
    })
  )

  ipcMain.handle(
    'db:services:update',
    wrap(async (_e, { id, ...data }) => {
      const user = requireAuth()
      return updateService(user, id, data)
    })
  )

  ipcMain.handle(
    'db:services:delete',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return deleteService(user, id)
    })
  )

  // ─── TRASH ────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:trash:list',
    wrap(async () => {
      const user = requireAdmin()
      return listTrash(user)
    })
  )

  ipcMain.handle(
    'db:trash:restore',
    wrap(async (_e, { index }) => {
      const user = requireAdmin()
      return restoreTrash(user, index)
    })
  )

  // ─── PROFILE ────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:profile:update',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return updateProfile(user, data)
    })
  )
}
