// ─── In-memory mock for Docker / browser development ───────────────────
// Mirrors the same schema and security rules as the Electron main process

const SALT = 'cromel-salt'
const CLIENT_MANAGER_DEPTS = ['Comercial', 'Financeiro']

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
const store = {
  users: [],
  tasks: [],
  clients: [],
  session: { userId: null }
}

async function seedData() {
  const adminHash = await hashPassword('admin123')
  const adminId = randomId()
  const fin1Id = randomId()
  const eng1Id = randomId()
  const lab1Id = randomId()
  const com1Id = randomId()
  const cam1Id = randomId()

  // Seed clients
  const t = now()
  const client1Id = randomId()
  const client2Id = randomId()
  const client3Id = randomId()

  store.clients = [
    {
      id: client1Id,
      nome: 'Construtora Silva',
      cidade: 'Sao Paulo',
      empresa: 'Silva & Filhos Ltda',
      telefone: '(11) 99999-0000',
      endereco: 'Rua das Flores, 123',
      createdBy: com1Id,
      createdAt: t,
      updatedAt: t
    },
    {
      id: client2Id,
      nome: 'Engenharia Costa',
      cidade: 'Rio de Janeiro',
      empresa: 'Costa Engenharia S.A.',
      telefone: '(21) 98888-1111',
      endereco: 'Av. Brasil, 456',
      createdBy: adminId,
      createdAt: t,
      updatedAt: t
    },
    {
      id: client3Id,
      nome: 'Laboratorio Nacional',
      cidade: 'Belo Horizonte',
      empresa: 'LabNacional Ltda',
      telefone: '(31) 97777-2222',
      endereco: 'Rua dos Testes, 789',
      createdBy: adminId,
      createdAt: t,
      updatedAt: t
    }
  ]

  store.users = [
    {
      id: adminId,
      username: 'admin',
      passwordHash: adminHash,
      plainPassword: 'admin123',
      role: 'admin',
      departments: [],
      createdAt: now()
    },
    {
      id: fin1Id,
      username: 'joao.financeiro',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      departments: ['Financeiro'],
      createdAt: now()
    },
    {
      id: eng1Id,
      username: 'maria.engenharia',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      departments: ['Engenharia'],
      createdAt: now()
    },
    {
      id: lab1Id,
      username: 'pedro.laboratorio',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      departments: ['Laboratorio'],
      createdAt: now()
    },
    {
      id: com1Id,
      username: 'ana.comercial',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      departments: ['Comercial', 'Financeiro'],
      createdAt: now()
    },
    {
      id: cam1Id,
      username: 'carlos.campo',
      passwordHash: await hashPassword('senha123'),
      plainPassword: 'senha123',
      role: 'user',
      departments: ['Campo', 'Engenharia'],
      createdAt: now()
    }
  ]

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
      title: 'Revisar relatorio mensal',
      description: 'Verificar todos os lancamentos do mes de fevereiro.',
      status: 'pendente',
      priority: 'alta',
      department: 'Financeiro',
      createdBy: adminId,
      assignedTo: fin1Id,
      dueDate: futureDate(2),
      clientId: client1Id,
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
      clientId: client1Id,
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Analise estrutural do projeto B',
      description: 'Calcular carga maxima para a nova estrutura do galpao.',
      status: 'em-andamento',
      priority: 'alta',
      department: 'Engenharia',
      createdBy: adminId,
      assignedTo: eng1Id,
      dueDate: futureDate(1),
      clientId: client2Id,
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Atualizar documentacao tecnica',
      description: 'Revisar e atualizar os manuais de operacao.',
      status: 'pendente',
      priority: 'baixa',
      department: 'Engenharia',
      createdBy: eng1Id,
      assignedTo: null,
      dueDate: futureDate(14),
      clientId: null,
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Calibrar equipamentos',
      description: 'Calibracao semestral dos equipamentos de medicao.',
      status: 'concluido',
      priority: 'alta',
      department: 'Laboratorio',
      createdBy: adminId,
      assignedTo: lab1Id,
      dueDate: null,
      clientId: client3Id,
      comments: [
        {
          id: randomId(),
          userId: lab1Id,
          username: 'pedro.laboratorio',
          text: 'Calibracao concluida com sucesso. Relatorio enviado.',
          createdAt: t
        }
      ],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Preparar amostras para analise',
      description: 'Preparar e catalogar amostras do lote 2024-03.',
      status: 'pendente',
      priority: 'media',
      department: 'Laboratorio',
      createdBy: lab1Id,
      assignedTo: null,
      dueDate: futureDate(5),
      clientId: client3Id,
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Elaborar proposta comercial',
      description: 'Preparar proposta para o cliente Construtora Silva.',
      status: 'pendente',
      priority: 'alta',
      department: 'Comercial',
      createdBy: com1Id,
      assignedTo: com1Id,
      dueDate: futureDate(3),
      clientId: client1Id,
      comments: [],
      createdAt: t,
      updatedAt: t
    },
    {
      id: randomId(),
      title: 'Visita tecnica ao canteiro',
      description: 'Realizar visita tecnica ao canteiro de obras do cliente.',
      status: 'em-andamento',
      priority: 'media',
      department: 'Campo',
      createdBy: cam1Id,
      assignedTo: cam1Id,
      dueDate: futureDate(1),
      clientId: client2Id,
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

function safeUser(u) {
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
  async listUsersBasic() {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    return ok(
      store.users.map((u) => ({
        id: u.id,
        username: u.username,
        photo: u.photo || null,
        departments: u.departments || [],
        role: u.role
      }))
    )
  },

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
      departments: Array.isArray(data.departments) ? data.departments : [],
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
    if (data.departments !== undefined) {
      user.departments = Array.isArray(data.departments) ? data.departments : []
    }
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
      tasks = tasks.filter((t) => caller.departments.includes(t.department))
    } else if (filters && filters.department) {
      tasks = tasks.filter((t) => t.department === filters.department)
    }
    if (filters && filters.status) tasks = tasks.filter((t) => t.status === filters.status)
    if (filters && filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority)
    if (filters && filters.clientId) tasks = tasks.filter((t) => t.clientId === filters.clientId)
    return ok(tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
  },

  async createTask(data) {
    const caller = getCallerUser()
    if (!caller) return err('Não autenticado.')
    // Any authenticated user can create tasks for any department
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
      clientId: data.clientId || null,
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
    if (caller.role !== 'admin' && !caller.departments.includes(task.department)) {
      return err('Sem permissão para editar tarefas de outro departamento.')
    }
    const updated = {
      ...task,
      ...updates,
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
    if (caller.role !== 'admin' && !caller.departments.includes(task.department)) {
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

  // ─── Clients ────────────────────────────────────────────────────────
  async listClients() {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    return ok([...store.clients].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
  },

  async getClient(id) {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    const client = store.clients.find((c) => c.id === id)
    if (!client) return err('Cliente nao encontrado.')
    return ok(client)
  },

  async createClient(data) {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    if (
      caller.role !== 'admin' &&
      !caller.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))
    ) {
      return err('Sem permissao para gerenciar clientes.')
    }
    if (!data.nome || !data.nome.trim()) return err('Nome do cliente e obrigatorio.')
    const t = now()
    const client = {
      id: randomId(),
      nome: data.nome.trim(),
      cidade: data.cidade?.trim() || '',
      empresa: data.empresa?.trim() || '',
      telefone: data.telefone?.trim() || '',
      endereco: data.endereco?.trim() || '',
      createdBy: caller.id,
      createdAt: t,
      updatedAt: t
    }
    store.clients.push(client)
    return ok(client)
  },

  async updateClient(id, data) {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    if (
      caller.role !== 'admin' &&
      !caller.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))
    ) {
      return err('Sem permissao para gerenciar clientes.')
    }
    const idx = store.clients.findIndex((c) => c.id === id)
    if (idx === -1) return err('Cliente nao encontrado.')
    const client = store.clients[idx]
    const safe = {}
    if (data.nome !== undefined) safe.nome = data.nome.trim()
    if (data.cidade !== undefined) safe.cidade = data.cidade.trim()
    if (data.empresa !== undefined) safe.empresa = data.empresa.trim()
    if (data.telefone !== undefined) safe.telefone = data.telefone.trim()
    if (data.endereco !== undefined) safe.endereco = data.endereco.trim()
    const updated = { ...client, ...safe, updatedAt: now() }
    store.clients[idx] = updated
    return ok(updated)
  },

  async deleteClient(id) {
    const caller = getCallerUser()
    if (!caller) return err('Nao autenticado.')
    if (
      caller.role !== 'admin' &&
      !caller.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d))
    ) {
      return err('Sem permissao para gerenciar clientes.')
    }
    const idx = store.clients.findIndex((c) => c.id === id)
    if (idx === -1) return err('Cliente nao encontrado.')
    store.clients.splice(idx, 1)
    store.tasks = store.tasks.map((t) => (t.clientId === id ? { ...t, clientId: null } : t))
    return ok({ id })
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
    listUsersBasic: () => mockApi.listUsersBasic(),
    listUsers: () => mockApi.listUsers(),
    createUser: (data) => mockApi.createUser(data),
    updateUser: (id, data) => mockApi.updateUser(id, data),
    deleteUser: (id) => mockApi.deleteUser(id),
    listTasks: (filters) => mockApi.listTasks(filters),
    createTask: (data) => mockApi.createTask(data),
    updateTask: (id, updates) => mockApi.updateTask(id, updates),
    deleteTask: (id) => mockApi.deleteTask(id),
    addComment: (taskId, text) => mockApi.addComment(taskId, text),
    listClients: () => mockApi.listClients(),
    getClient: (id) => mockApi.getClient(id),
    createClient: (data) => mockApi.createClient(data),
    updateClient: (id, data) => mockApi.updateClient(id, data),
    deleteClient: (id) => mockApi.deleteClient(id),
    updateProfile: (data) => mockApi.updateProfile(data)
  }
}
