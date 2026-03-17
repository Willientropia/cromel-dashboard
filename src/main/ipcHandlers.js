import { ipcMain } from 'electron'
import {
  getCurrentUser,
  loginUser,
  clearSession,
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
      return await loginUser(username, password)
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
      const user = getCurrentUser()
      if (!user) return null
      return await getUserById(user.id)
    })
  )

  // ─── USERS ─────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:users:list-basic',
    wrap(async () => {
      requireAuth()
      return await listUsersBasic()
    })
  )

  ipcMain.handle(
    'db:users:list',
    wrap(async () => {
      requireAdmin()
      return await listUsers()
    })
  )

  ipcMain.handle(
    'db:users:create',
    wrap(async (_e, data) => {
      requireAdmin()
      return await createUser(data)
    })
  )

  ipcMain.handle(
    'db:users:update',
    wrap(async (_e, { id, ...data }) => {
      requireAdmin()
      return await updateUser(id, data)
    })
  )

  ipcMain.handle(
    'db:users:delete',
    wrap(async (_e, { id }) => {
      requireAdmin()
      return await deleteUser(id)
    })
  )

  // ─── TASKS ─────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:tasks:list',
    wrap(async (_e, filters) => {
      const user = requireAuth()
      return await listTasks(user, filters)
    })
  )

  ipcMain.handle(
    'db:tasks:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return await createTask(user, data)
    })
  )

  ipcMain.handle(
    'db:tasks:update',
    wrap(async (_e, { id, ...updates }) => {
      const user = requireAuth()
      return await updateTask(user, id, updates)
    })
  )

  ipcMain.handle(
    'db:tasks:delete',
    wrap(async (_e, { id }) => {
      const user = requireAdmin()
      return await deleteTask(user, id)
    })
  )

  ipcMain.handle(
    'db:tasks:archive',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return await archiveTask(user, id)
    })
  )

  ipcMain.handle(
    'db:tasks:comment',
    wrap(async (_e, { taskId, text }) => {
      const user = requireAuth()
      return await addComment(user, taskId, text)
    })
  )

  // ─── CLIENTS ───────────────────────────────────────────────────────
  ipcMain.handle(
    'db:clients:list',
    wrap(async () => {
      const user = requireAuth()
      return await listClients(user)
    })
  )

  ipcMain.handle(
    'db:clients:get',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return await getClientById(user, id)
    })
  )

  ipcMain.handle(
    'db:clients:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return await createClient(user, data)
    })
  )

  ipcMain.handle(
    'db:clients:update',
    wrap(async (_e, { id, ...data }) => {
      const user = requireAuth()
      return await updateClient(user, id, data)
    })
  )

  ipcMain.handle(
    'db:clients:delete',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return await deleteClient(user, id)
    })
  )

  // ─── SERVICES ──────────────────────────────────────────────────────
  ipcMain.handle(
    'db:services:list',
    wrap(async (_e, { clientId }) => {
      const user = requireAuth()
      return await listServices(user, clientId)
    })
  )

  ipcMain.handle(
    'db:services:create',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return await createService(user, data)
    })
  )

  ipcMain.handle(
    'db:services:update',
    wrap(async (_e, { id, ...data }) => {
      const user = requireAuth()
      return await updateService(user, id, data)
    })
  )

  ipcMain.handle(
    'db:services:delete',
    wrap(async (_e, { id }) => {
      const user = requireAuth()
      return await deleteService(user, id)
    })
  )

  // ─── TRASH ────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:trash:list',
    wrap(async () => {
      const user = requireAdmin()
      return await listTrash(user)
    })
  )

  ipcMain.handle(
    'db:trash:restore',
    wrap(async (_e, { id }) => {
      const user = requireAdmin()
      return await restoreTrash(user, id)
    })
  )

  // ─── PROFILE ────────────────────────────────────────────────────────
  ipcMain.handle(
    'db:profile:update',
    wrap(async (_e, data) => {
      const user = requireAuth()
      return await updateProfile(user, data)
    })
  )
}
