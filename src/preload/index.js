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
  addComment: (taskId, text) => invoke('db:tasks:comment', { taskId, text }),

  // Profile
  updateProfile: (data) => invoke('db:profile:update', data)
})
