// ─── In-memory mock for Docker / browser development ───────────────────
// Mirrors the same schema and security rules as the Electron main process

const SALT = 'cromel-salt'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + SALT)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// ─── Seed data ──────────────────────────────────────────────────────────
const ADMIN_PASS_HASH =
  'c4e2b1bd73e0b62a8b5f73c0cc2d75dd87dd1f24b19e01b56f7f879e0a55d93b' // placeholder, recomputed at init

const store = {
  users: [],
  tasks: [],
  session: { userId: null }
}

async function seedData() {
  const adminHash = await hashPassword('admin123')
  const adminId = randomId()
  const fin1Id = randomId()
  const eng1Id = randomId()
  const lab1Id = randomId()

  store.users = [
    {
      id: adminId,
      username: 'admin',
      passwordHash: adminHash,
      plainPassword: 'admin123',
      role: 'admin',
      department: null,
      createdAt: now()
    },
    {
      id: fin1Id,
      username: 'joao.financeiro',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      department: 'Financeiro',
      createdAt: now()
    },
    {
      id: eng1Id,
      username: 'maria.engenharia',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      department: 'Engenharia',
      createdAt: now()
    },
    {
      id: lab1Id,
      username: 'pedro.laboratorio',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      department: 'Laboratorio',
      createdAt: now()
    }
  ]

  const t = now()
  // Helper to create future dates for seed data
  function futureDate(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  store.tasks = [
    {
      id: randomId(),
      title: 'Revisar relatório mensal',
      description: 'Verificar todos os lançamentos do mês de fevereiro.',
      status: 'pendente',
      priority: 'alta',
      department: 'Financeiro',
      createdBy: adminId,
      assignedTo: fin1Id,
      dueDate: futureDate(2),
      comments: [
        {
          id: randomId(),
          userId: adminId,
          username: 'admin',
          text: 'Por favor, priorize esta tarefa antes do fechamento.',
          createdAt: t
        }
      ],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Conciliar contas a pagar',
      description: 'Verificar pagamentos pendentes com fornecedores.',
      status: 'em-andamento',
      priority: 'media',
      department: 'Financeiro',
      createdBy: fin1Id,
      assignedTo: null,
      dueDate: futureDate(7),
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Análise estrutural do projeto B',
      description: 'Calcular carga máxima para a nova estrutura do galpão.',
      status: 'em-andamento',
      priority: 'alta',
      department: 'Engenharia',
      createdBy: adminId,
      assignedTo: eng1Id,
      dueDate: futureDate(1),
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Atualizar documentação técnica',
      description: 'Revisar e atualizar os manuais de operação.',
      status: 'pendente',
      priority: 'baixa',
      department: 'Engenharia',
      createdBy: eng1Id,
      assignedTo: null,
      dueDate: futureDate(14),
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Calibrar equipamentos',
      description: 'Calibração semestral dos equipamentos de medição.',
      status: 'concluido',
      priority: 'alta',
      department: 'Laboratorio',
      createdBy: adminId,
      assignedTo: lab1Id,
      dueDate: null,
      comments: [
        {
          id: randomId(),
          userId: lab1Id,
          username: 'pedro.laboratorio',
          text: 'Calibração concluída com sucesso. Relatório enviado.',
          createdAt: t
        }
      ],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Preparar amostras para análise',
      description: 'Preparar e catalogar amostras do lote 2024-03.',
      status: 'pendente',
      priority: 'media',
      department: 'Laboratorio',
      createdBy: lab1Id,
      assignedTo: null,
      dueDate: futureDate(5),
      comments: [],
      createdAt: t,
      updatedAt: t
    }
  ]
}

// ─── Helpers ────────────────────────────────────────────────────────────
function ok(data) {
  return { success: true, data }
}
function err(msg) {
  return { success: false, error: msg }
}

function getCallerUser() {
  if (!store.session.userId) return null
  return store.users.find((u) => u.id === store.session.userId) || null
}

function safeUser(u, includePassword = false) {
  if (!u) return null
  const { passwordHash, ...safe } = u
  return safe
}

// ─── Mock API implementation ─────────────────────────────────────────────
const mockApi = {
  async login(username, password) {
    try {
      const user = store.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      )
      if (!user) return err('Usuário ou senha incorretos.')
      const hash = await hashPassword(password)
      if (user.passwordHash !== hash) return err('Usuário ou senha incorretos.')
      store.session.userId = user.id
      return ok(safeUser(user))
    } catch (e) {
      return err(e.message)
    }
  },

  async logout() {
    store.session.userId = null
    return ok(null)
  },

  async getSession() {
    const user = getCallerUser()
    return ok(user ? safeUser(user) : null)
  },

  // ─── Users ──────────────────────────────────────────────────────────
  async listUsers() {
    const caller = getCallerUser()
    if (!caller || caller.role !== 'admin') return err('Acesso negado.')
    return ok(store.users.map(safeUser))
  },

  async createUser(data) {
    const caller = getCallerUser()
    if (!caller || caller.role !== 'admin') return err('Acesso negado.')
    const dup = store.users.find(
      (u) => u.username.toLowerCase() === data.username.toLowerCase()
    )
    if (dup) return err('Nome de usuário já existe.')
    const user = {
      id: randomId(),
      username: data.username.trim(),
      passwordHash: await hashPassword(data.password),
      plainPassword: data.password,
      role: 'user',
      department: data.department,
      createdAt: now()
    }
    store.users.push(user)
    return ok(safeUser(user))
  },

  async updateUser(id, data) {
    const caller = getCallerUser()
    if (!caller || caller.role !== 'admin') return err('Acesso negado.')
    const idx = store.users.findIndex((u) => u.id === id)
    if (idx === -1) return err('Usuário não encontrado.')
    const user = { ...store.users[idx] }
    if (data.username) {
      const dup = store.users.find(
        (u) => u.id !== id && u.username.toLowerCase() === data.username.toLowerCase()
      )
      if (dup) return err('Nome de usuário já existe.')
      user.username = data.username.trim()
    }
    if (data.password) {
      user.passwordHash = await hashPassword(data.password)
      user.plainPassword = data.password
    }
    if (data.department !== undefined) user.department = data.department
    store.users[idx] = user
    return ok(safeUser(user))
  },

  async deleteUser(id) {
    const caller = getCallerUser()
    if (!caller || caller.role !== 'admin') return err('Acesso negado.')
    const idx = store.users.findIndex((u) => u.id === id)
    if (idx === -1) return err('Usuário não encontrado.')
    if (store.users[idx].role === 'admin') return err('Não é possível excluir o administrador.')
    store.users.splice(idx, 1)
    store.tasks = store.tasks.map((t) =>
      t.assignedTo === id ? { ...t, assignedTo: null } : t
    )
    return ok({ id })
  },

  // ─── Tasks ──────────────────────────────────────────────────────────
  async listTasks(filters = {}) {
    const caller = getCallerUser()
    if (!caller) return err('Não autenticado.')
    let tasks = [...store.tasks]
    if (caller.role !== 'admin') {
      tasks = tasks.filter((t) => t.department === caller.department)
    } else if (filters && filters.department) {
      tasks = tasks.filter((t) => t.department === filters.department)
    }
    if (filters && filters.status) tasks = tasks.filter((t) => t.status === filters.status)
    if (filters && filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority)
    return ok(tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
  },

  async createTask(data) {
    const caller = getCallerUser()
    if (!caller) return err('Não autenticado.')
    if (caller.role !== 'admin' && data.department !== caller.department) {
      return err('Sem permissão para criar tarefas em outro departamento.')
    }
    const t = now()
    const task = {
      id: randomId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'pendente',
      priority: data.priority || 'media',
      department: data.department,
      createdBy: caller.id,
      assignedTo: data.assignedTo || null,
      dueDate: data.dueDate || null,
      comments: [],
      createdAt: t,
      updatedAt: t
    }
    store.tasks.push(task)
    return ok(task)
  },

  async updateTask(id, updates) {
    const caller = getCallerUser()
    if (!caller) return err('Não autenticado.')
    const idx = store.tasks.findIndex((t) => t.id === id)
    if (idx === -1) return err('Tarefa não encontrada.')
    const task = store.tasks[idx]
    if (caller.role !== 'admin' && task.department !== caller.department) {
      return err('Sem permissão para editar tarefas de outro departamento.')
    }
    const safe = { ...updates }
    if (caller.role !== 'admin') delete safe.department
    const updated = {
      ...task,
      ...safe,
      id: task.id,
      createdBy: task.createdBy,
      comments: task.comments,
      createdAt: task.createdAt,
      updatedAt: now()
    }
    store.tasks[idx] = updated
    return ok(updated)
  },

  async deleteTask(id) {
    const caller = getCallerUser()
    if (!caller || caller.role !== 'admin') return err('Acesso negado.')
    const idx = store.tasks.findIndex((t) => t.id === id)
    if (idx === -1) return err('Tarefa não encontrada.')
    store.tasks.splice(idx, 1)
    return ok({ id })
  },

  async addComment(taskId, text) {
    const caller = getCallerUser()
    if (!caller) return err('Não autenticado.')
    if (!text || !text.trim()) return err('Comentário não pode ser vazio.')
    const idx = store.tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return err('Tarefa não encontrada.')
    const task = store.tasks[idx]
    if (caller.role !== 'admin' && task.department !== caller.department) {
      return err('Sem permissão.')
    }
    const comment = {
      id: randomId(),
      userId: caller.id,
      username: caller.username,
      text: text.trim(),
      createdAt: now()
    }
    task.comments.push(comment)
    task.updatedAt = now()
    return ok(comment)
  },

  async updateProfile(data) {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    const idx = store.users.findIndex((u) => u.id === caller.id)
    if (idx === -1) return err('Usuario nao encontrado.')
    const user = { ...store.users[idx] }
    if (data.photo !== undefined) user.photo = data.photo
    if (data.password) {
      user.passwordHash = await hashPassword(data.password)
      user.plainPassword = data.password
    }
    store.users[idx] = user
    return ok(safeUser(user))
  }
}

export async function setupMockApi() {
  await seedData()

  window.api = {
    login: (username, password) => mockApi.login(username, password),
    logout: () => mockApi.logout(),
    getSession: () => mockApi.getSession(),
    listUsers: () => mockApi.listUsers(),
    createUser: (data) => mockApi.createUser(data),
    updateUser: (id, data) => mockApi.updateUser(id, data),
    deleteUser: (id) => mockApi.deleteUser(id),
    listTasks: (filters) => mockApi.listTasks(filters),
    createTask: (data) => mockApi.createTask(data),
    updateTask: (id, updates) => mockApi.updateTask(id, updates),
    deleteTask: (id) => mockApi.deleteTask(id),
    addComment: (taskId, text) => mockApi.addComment(taskId, text),
    updateProfile: (data) => mockApi.updateProfile(data)
  }
}
