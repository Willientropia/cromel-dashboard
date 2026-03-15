import { contextBridge, ipcRenderer } from 'electron'

function invoke(channel, data) {
  return ipcRenderer.invoke(channel, data)
}

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (username, password) => invoke('auth:login', { username, password }),
  logout: () => invoke('auth:logout'),
  getSession: () => invoke('auth:session'),

  // Users
  listUsersBasic: () => invoke('db:users:list-basic'),
  listUsers: () => invoke('db:users:list'),
  createUser: (data) => invoke('db:users:create', data),
  updateUser: (id, data) => invoke('db:users:update', { id, ...data }),
  deleteUser: (id) => invoke('db:users:delete', { id }),

  // Tasks
  listTasks: (filters) => invoke('db:tasks:list', filters),
  createTask: (data) => invoke('db:tasks:create', data),
  updateTask: (id, updates) => invoke('db:tasks:update', { id, ...updates }),
  deleteTask: (id) => invoke('db:tasks:delete', { id }),
  archiveTask: (id) => invoke('db:tasks:archive', { id }),
  addComment: (taskId, text) => invoke('db:tasks:comment', { taskId, text }),

  // Clients
  listClients: () => invoke('db:clients:list'),
  getClient: (id) => invoke('db:clients:get', { id }),
  createClient: (data) => invoke('db:clients:create', data),
  updateClient: (id, data) => invoke('db:clients:update', { id, ...data }),
  deleteClient: (id) => invoke('db:clients:delete', { id }),

  // Services
  listServices: (clientId) => invoke('db:services:list', { clientId }),
  createService: (data) => invoke('db:services:create', data),
  updateService: (id, data) => invoke('db:services:update', { id, ...data }),
  deleteService: (id) => invoke('db:services:delete', { id }),

  // Trash
  listTrash: () => invoke('db:trash:list'),
  restoreTrash: (index) => invoke('db:trash:restore', { index }),

  // Profile
  updateProfile: (data) => invoke('db:profile:update', data)
})
