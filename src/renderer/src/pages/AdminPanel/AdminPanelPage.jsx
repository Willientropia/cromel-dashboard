import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard'
import TaskModal from '../../components/TaskModal/TaskModal'
import UserModal from '../../components/UserModal/UserModal'
import ClientModal from '../../components/ClientModal/ClientModal'
import ClientDetailModal from '../../components/ClientDetailModal/ClientDetailModal'
import FollowUpModal from '../../components/FollowUpModal/FollowUpModal'
import {
  IconBolt,
  IconRefresh,
  IconUsers,
  IconPlus,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconTrash,
  DeptIcon
} from '../../components/Icons/Icons'
import { DEPARTMENTS, DEPT_COLORS } from '../../lib/constants'
import AdminOverview from '../../components/AdminOverview/AdminOverview'

function getInitials(username) {
  if (!username) return '?'
  return username.split(/[._-]/).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminPanelPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const urlTab = params.get('tab')
  const urlDept = params.get('dept')

  const [activeTab, setActiveTab] = useState(urlDept || urlTab || 'overview')
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [trash, setTrash] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedClientDetail, setSelectedClientDetail] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [followUpDefaults, setFollowUpDefaults] = useState(null)
  const [pendingFollowUp, setPendingFollowUp] = useState(null)

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
      const [tasksRes, usersRes, clientsRes, trashRes] = await Promise.all([
        window.api.listTasks({}),
        window.api.listUsers(),
        window.api.listClients(),
        window.api.listTrash()
      ])
      if (tasksRes.success) setTasks(tasksRes.data)
      if (usersRes.success) setUsers(usersRes.data)
      if (clientsRes.success) setClients(clientsRes.data)
      if (trashRes.success) setTrash(trashRes.data)
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
    else if (urlTab === 'trash') setActiveTab('trash')
    else if (urlDept && DEPARTMENTS.includes(urlDept)) setActiveTab(urlDept)
    else if (!urlDept && !urlTab) setActiveTab('overview')
  }, [urlDept, urlTab])

  async function handleArchiveTask(taskId) {
    const res = await window.api.updateTask(taskId, { archived: true })
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      showToast('Tarefa arquivada.')
    } else {
      showToast(res.error || 'Erro ao arquivar.', 'error')
    }
  }

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
    } else if (newStatus === 'concluido') {
      setPendingFollowUp({ taskId, clientId: task?.clientId || null, originalTitle: task?.title || '' })
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

    if (saved.status === 'concluido') {
      setPendingFollowUp({ taskId: saved.id, clientId: saved.clientId || null, originalTitle: saved.title || '' })
    }
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
    loadData()
  }

  async function handleRestoreTrash(index) {
    const res = await window.api.restoreTrash(index)
    if (res.success) {
      showToast('Item restaurado!')
      loadData()
    } else {
      showToast(res.error || 'Erro ao restaurar.', 'error')
    }
  }

  const isDeptTab = DEPARTMENTS.includes(activeTab)
  // Filter out completed tasks from department kanban view
  const deptTasks = isDeptTab
    ? (filterPriority
        ? tasks.filter((t) => t.department === activeTab && t.priority === filterPriority && !t.archived)
        : tasks.filter((t) => t.department === activeTab && !t.archived))
    : []

  const nonAdminUsers = users.filter((u) => u.role !== 'admin')

  const filteredClients = clientSearch
    ? clients.filter((c) => {
        const q = clientSearch.toLowerCase()
        return (
          c.nome.toLowerCase().includes(q) ||
          c.dadosObra?.toLowerCase().includes(q) ||
          c.orc?.toLowerCase().includes(q) ||
          c.tipoObra?.toLowerCase().includes(q)
        )
      })
    : clients

  const sortedClients = [...filteredClients].sort((a, b) => {
    const aActive = tasks.some((t) => t.clientId === a.id && !t.archived && t.status !== 'concluido')
    const bActive = tasks.some((t) => t.clientId === b.id && !t.archived && t.status !== 'concluido')
    if (aActive !== bActive) return aActive ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

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
        <button
          className={`admin-tab${activeTab === 'trash' ? ' active' : ''}`}
          onClick={() => setActiveTab('trash')}
        >
          <IconTrash size={15} /> Lixeira
        </button>
      </div>

      <div className="page-content">
        {/* Overview dashboard */}
        {activeTab === 'overview' && (
          <AdminOverview tasks={tasks} users={users} clients={clients} />
        )}

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
                onArchiveTask={handleArchiveTask}
              />
            )}
          </div>
        )}

        {/* Clients management view */}
        {activeTab === 'clients' && (
          <div>
            <div className="kanban-toolbar" style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setShowNewClient(true)}>
                <IconPlus size={14} /> Novo Cliente
              </button>
              <input
                className="form-input"
                placeholder="Buscar por nome, obra, ORC ou tipo..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ width: 'auto', minWidth: 250 }}
              />
              <span className="text-sm text-muted">
                {sortedClients.length} cliente{sortedClients.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner" /> Carregando clientes...
              </div>
            ) : sortedClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                {clientSearch ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              </div>
            ) : (
              <div className="user-table-section">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Dados da Obra</th>
                      <th>ORC/OV/OSS</th>
                      <th>Tipo de Obra</th>
                      <th>Tarefas Ativas</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedClients.map((c) => {
                      const active = tasks.some((t) => t.clientId === c.id && !t.archived && t.status !== 'concluido')
                      const activeTasks = tasks.filter((t) => t.clientId === c.id && !t.archived && t.status !== 'concluido')
                      return (
                        <tr
                          key={c.id}
                          style={{ cursor: 'pointer', opacity: active ? 1 : 0.55 }}
                          onClick={() => setSelectedClientDetail(c)}
                        >
                          <td><span className="font-bold">{c.nome}</span></td>
                          <td className="text-sm">{c.dadosObra || '\u2014'}</td>
                          <td className="text-sm">{c.orc || '\u2014'}</td>
                          <td className="text-sm">{c.tipoObra || '\u2014'}</td>
                          <td>
                            <span className="text-sm">
                              {activeTasks.length > 0
                                ? `${activeTasks.length} tarefa${activeTasks.length !== 1 ? 's' : ''}`
                                : '\u2014'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: active ? 'var(--col-progress-header)20' : 'var(--gray-200)',
                              color: active ? 'var(--col-progress-header)' : 'var(--text-muted)'
                            }}>
                              {active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
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
              </div>
            )}
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

        {/* Trash view */}
        {activeTab === 'trash' && (
          <div>
            <div className="user-table-section">
              <div className="user-table-header">
                <h3>Lixeira</h3>
                <span className="text-sm text-muted">Itens sao removidos automaticamente apos 3 dias</span>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" /> Carregando lixeira...
                </div>
              ) : trash.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
                  Lixeira vazia.
                </div>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nome</th>
                      <th>Excluido em</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trash.map((entry, idx) => {
                      const typeLabels = { client: 'Cliente', service: 'Servico', task: 'Tarefa' }
                      const name = entry.item?.nome || entry.item?.title || '—'
                      return (
                        <tr key={idx}>
                          <td><span className="text-sm">{typeLabels[entry.type] || entry.type}</span></td>
                          <td><span className="font-bold">{name}</span></td>
                          <td className="text-sm text-muted">
                            {new Date(entry.deletedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRestoreTrash(idx)}
                            >
                              Restaurar
                            </button>
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
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSaved={(s) => { handleTaskSaved(s); setSelectedTask(null) }}
          onDeleted={(id) => { handleTaskDeleted(id); setSelectedTask(null) }}
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

      {pendingFollowUp && (
        <FollowUpModal
          onArchive={async () => {
            if (pendingFollowUp?.taskId) await handleArchiveTask(pendingFollowUp.taskId)
            setPendingFollowUp(null)
          }}
          onFollowUp={() => {
            setFollowUpDefaults({ clientId: pendingFollowUp.clientId, originalTitle: pendingFollowUp.originalTitle })
            setPendingFollowUp(null)
          }}
          onClose={() => setPendingFollowUp(null)}
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

      {selectedClientDetail && (
        <ClientDetailModal
          client={selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          onClientUpdated={(s) => { handleClientSaved(s) }}
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
