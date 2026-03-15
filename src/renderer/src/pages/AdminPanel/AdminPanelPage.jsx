import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard'
import TaskModal from '../../components/TaskModal/TaskModal'
import UserModal from '../../components/UserModal/UserModal'
import ClientModal from '../../components/ClientModal/ClientModal'
import {
  IconBolt,
  IconRefresh,
  IconUsers,
  IconPlus,
  IconEdit,
  IconEye,
  IconEyeOff,
  DeptIcon
} from '../../components/Icons/Icons'
import { DEPARTMENTS, DEPT_COLORS } from '../../lib/constants'

function getInitials(username) {
  if (!username) return '?'
  return username.split(/[._-]/).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminPanelPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const urlTab = params.get('tab')
  const urlDept = params.get('dept')

  const [activeTab, setActiveTab] = useState(urlDept || urlTab || DEPARTMENTS[0])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [followUpDefaults, setFollowUpDefaults] = useState(null)

  function togglePasswordVisibility(userId) {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes, clientsRes] = await Promise.all([
        window.api.listTasks({}),
        window.api.listUsers(),
        window.api.listClients()
      ])
      if (tasksRes.success) setTasks(tasksRes.data)
      if (usersRes.success) setUsers(usersRes.data)
      if (clientsRes.success) setClients(clientsRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (urlTab === 'users') setActiveTab('users')
    else if (urlTab === 'clients') setActiveTab('clients')
    else if (urlDept && DEPARTMENTS.includes(urlDept)) setActiveTab(urlDept)
  }, [urlDept, urlTab])

  async function handleTaskMove(taskId, newStatus) {
    const task = tasks.find((t) => t.id === taskId)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    )
    const res = await window.api.updateTask(taskId, { status: newStatus })
    if (!res.success) {
      showToast(res.error || 'Erro ao mover tarefa.', 'error')
      loadData()
    } else if (
      newStatus === 'concluido' &&
      task?.status !== 'concluido' &&
      task?.clientId
    ) {
      const wantsFollowUp = window.confirm(
        'Tarefa concluida! Deseja criar uma tarefa de acompanhamento para outro departamento?'
      )
      if (wantsFollowUp) {
        setFollowUpDefaults({ clientId: task.clientId, originalTitle: task.title })
      }
    }
  }

  function handleTaskSaved(saved) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    showToast('Tarefa salva!')
  }

  function handleTaskDeleted(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showToast('Tarefa excluida.')
  }

  function handleUserSaved(saved) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    showToast('Usuario salvo!')
  }

  function handleUserDeleted(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    showToast('Usuario excluido.')
  }

  function handleClientSaved(saved) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    showToast('Cliente salvo!')
  }

  function handleClientDeleted(id) {
    setClients((prev) => prev.filter((c) => c.id !== id))
    showToast('Cliente excluido.')
  }

  const isDeptTab = DEPARTMENTS.includes(activeTab)
  const deptTasks = isDeptTab
    ? (filterPriority
        ? tasks.filter((t) => t.department === activeTab && t.priority === filterPriority)
        : tasks.filter((t) => t.department === activeTab))
    : []

  const nonAdminUsers = users.filter((u) => u.role !== 'admin')

  const filteredClients = clientSearch
    ? clients.filter((c) => {
        const q = clientSearch.toLowerCase()
        return (
          c.nome.toLowerCase().includes(q) ||
          c.cidade?.toLowerCase().includes(q) ||
          c.empresa?.toLowerCase().includes(q)
        )
      })
    : clients

  // Build client map for kanban
  const clientMap = {}
  clients.forEach((c) => { clientMap[c.id] = c })

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1><IconBolt size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />Painel Administrativo</h1>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <IconRefresh size={14} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            className={`admin-tab${activeTab === d ? ' active' : ''}`}
            onClick={() => setActiveTab(d)}
          >
            <DeptIcon department={d} size={15} /> {d}
          </button>
        ))}
        <button
          className={`admin-tab${activeTab === 'clients' ? ' active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <IconUsers size={15} /> Clientes
        </button>
        <button
          className={`admin-tab${activeTab === 'users' ? ' active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <IconUsers size={15} /> Usuarios
        </button>
      </div>

      <div className="page-content">
        {/* Department Kanban view */}
        {isDeptTab && (
          <div className="kanban-wrapper">
            <div className="kanban-toolbar">
              <button
                className="btn btn-primary"
                onClick={() => setShowNewTask(true)}
              >
                <IconPlus size={14} /> Nova Tarefa
              </button>

              <select
                className="form-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{ width: 'auto', minWidth: 140 }}
              >
                <option value="">Todas as prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baixa">Baixa</option>
              </select>

              <span className="text-sm text-muted">
                {deptTasks.length} tarefa{deptTasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner" /> Carregando...
              </div>
            ) : (
              <KanbanBoard
                tasks={deptTasks}
                users={users}
                clientMap={clientMap}
                showDept={false}
                onTaskMove={handleTaskMove}
                onCardClick={(t) => setSelectedTask(t)}
              />
            )}
          </div>
        )}

        {/* Clients management view */}
        {activeTab === 'clients' && (
          <div>
            <div className="user-table-section">
              <div className="user-table-header">
                <h3>Clientes</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    style={{ width: 200 }}
                  />
                  <button className="btn btn-primary" onClick={() => setShowNewClient(true)}>
                    <IconPlus size={14} /> Novo Cliente
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" /> Carregando clientes...
                </div>
              ) : filteredClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                  {clientSearch ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                </div>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Cidade</th>
                      <th>Empresa</th>
                      <th>Telefone</th>
                      <th>Tarefas</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => {
                      const clientTasks = tasks.filter((t) => t.clientId === c.id)
                      return (
                        <tr key={c.id}>
                          <td><span className="font-bold">{c.nome}</span></td>
                          <td className="text-sm">{c.cidade || '\u2014'}</td>
                          <td className="text-sm">{c.empresa || '\u2014'}</td>
                          <td className="text-sm">{c.telefone || '\u2014'}</td>
                          <td>
                            <span className="text-sm">
                              {clientTasks.length > 0
                                ? `${clientTasks.length} tarefa${clientTasks.length !== 1 ? 's' : ''}`
                                : '\u2014'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                onClick={() => setSelectedClient(c)}
                                title="Editar"
                              >
                                <IconEdit size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Users management view */}
        {activeTab === 'users' && (
          <div>
            <div className="user-table-section">
              <div className="user-table-header">
                <h3>Usuarios do Sistema</h3>
                <button className="btn btn-primary" onClick={() => setShowNewUser(true)}>
                  <IconPlus size={14} /> Novo Usuario
                </button>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" /> Carregando usuarios...
                </div>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Senha</th>
                      <th>Funcao</th>
                      <th>Departamentos</th>
                      <th>Tarefas</th>
                      <th>Criado em</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter((u) => u.role === 'admin').map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {u.photo ? (
                              <img src={u.photo} alt={u.username} className="table-avatar-img" />
                            ) : (
                              <div
                                className="sidebar-avatar"
                                style={{ width: 30, height: 30, fontSize: 11 }}
                              >
                                {getInitials(u.username)}
                              </div>
                            )}
                            <span className="font-bold">{u.username}</span>
                          </div>
                        </td>
                        <td>
                          <div className="password-cell">
                            <span className="text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                              {visiblePasswords[u.id] ? (u.plainPassword || '***') : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                            </span>
                            <button className="btn-icon" onClick={() => togglePasswordVisibility(u.id)} title={visiblePasswords[u.id] ? 'Ocultar senha' : 'Ver senha'}>
                              {visiblePasswords[u.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td><span className="role-badge admin">Administrador</span></td>
                        <td><span className="text-muted">&mdash;</span></td>
                        <td>
                          <span className="text-sm text-muted">
                            {tasks.filter((t) => t.createdBy === u.id).length} criadas
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          <span className="text-sm text-muted">&mdash;</span>
                        </td>
                      </tr>
                    ))}

                    {nonAdminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                          Nenhum usuario cadastrado. Clique em &quot;Novo Usuario&quot; para criar.
                        </td>
                      </tr>
                    ) : (
                      nonAdminUsers.map((u) => {
                        const userTasks = tasks.filter((t) => t.assignedTo === u.id)
                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {u.photo ? (
                                <img src={u.photo} alt={u.username} className="table-avatar-img" />
                              ) : (
                                <div
                                  className="sidebar-avatar"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    fontSize: 11,
                                    background: DEPT_COLORS[u.departments?.[0]] || 'var(--primary)'
                                  }}
                                >
                                  {getInitials(u.username)}
                                </div>
                              )}
                                <span className="font-bold">{u.username}</span>
                              </div>
                            </td>
                            <td>
                              <div className="password-cell">
                                <span className="text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {visiblePasswords[u.id] ? (u.plainPassword || '***') : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                                </span>
                                <button className="btn-icon" onClick={() => togglePasswordVisibility(u.id)} title={visiblePasswords[u.id] ? 'Ocultar senha' : 'Ver senha'}>
                                  {visiblePasswords[u.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                                </button>
                              </div>
                            </td>
                            <td><span className="role-badge user">Usuario</span></td>
                            <td>
                              <div className="dept-chips">
                                {(u.departments || []).map((d) => (
                                  <span
                                    key={d}
                                    className="dept-badge"
                                    style={{
                                      background: `${DEPT_COLORS[d]}15`,
                                      color: DEPT_COLORS[d]
                                    }}
                                  >
                                    <DeptIcon department={d} size={12} /> {d}
                                  </span>
                                ))}
                                {(!u.departments || u.departments.length === 0) && (
                                  <span className="text-muted">&mdash;</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="text-sm">
                                {userTasks.length > 0
                                  ? `${userTasks.length} atribuida${userTasks.length !== 1 ? 's' : ''}`
                                  : '\u2014'}
                              </span>
                            </td>
                            <td className="text-sm text-muted">
                              {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="btn-icon"
                                  onClick={() => setSelectedUser(u)}
                                  title="Editar"
                                >
                                  <IconEdit size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSaved={(s) => { handleTaskSaved(s); setSelectedTask(null) }}
          onDeleted={(id) => { handleTaskDeleted(id); setSelectedTask(null) }}
          onRequestFollowUp={(defaults) => {
            setSelectedTask(null)
            setFollowUpDefaults(defaults)
          }}
        />
      )}

      {showNewTask && (
        <TaskModal
          defaultDept={isDeptTab ? activeTab : DEPARTMENTS[0]}
          users={users}
          onClose={() => setShowNewTask(false)}
          onSaved={(s) => { handleTaskSaved(s); setShowNewTask(false) }}
        />
      )}

      {followUpDefaults && (
        <TaskModal
          defaultClientId={followUpDefaults.clientId}
          users={users}
          onClose={() => setFollowUpDefaults(null)}
          onSaved={(s) => { handleTaskSaved(s); setFollowUpDefaults(null) }}
        />
      )}

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={(s) => { handleUserSaved(s); setSelectedUser(null) }}
          onDeleted={(id) => { handleUserDeleted(id); setSelectedUser(null) }}
        />
      )}

      {showNewUser && (
        <UserModal
          onClose={() => setShowNewUser(false)}
          onSaved={(s) => { handleUserSaved(s); setShowNewUser(false) }}
        />
      )}

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSaved={(s) => { handleClientSaved(s); setSelectedClient(null) }}
          onDeleted={(id) => { handleClientDeleted(id); setSelectedClient(null) }}
        />
      )}

      {showNewClient && (
        <ClientModal
          onClose={() => setShowNewClient(false)}
          onSaved={(s) => { handleClientSaved(s); setShowNewClient(false) }}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '\u2713' : '\u2717'}</span>
          {toast.msg}
        </div>
      )}
    </>
  )
}
