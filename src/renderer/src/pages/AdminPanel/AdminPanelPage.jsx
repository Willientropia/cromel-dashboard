import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard'
import TaskModal from '../../components/TaskModal/TaskModal'
import UserModal from '../../components/UserModal/UserModal'

const DEPARTMENTS = ['Financeiro', 'Engenharia', 'Laboratorio']
const DEPT_ICONS = { Financeiro: '💰', Engenharia: '⚙️', Laboratorio: '🔬' }
const DEPT_COLORS = { Financeiro: '#2E7D32', Engenharia: '#1565C0', Laboratorio: '#6A1B9A' }

function getInitials(username) {
  if (!username) return '?'
  return username.split(/[._-]/).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminPanelPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  // Determine active tab from URL param
  const urlTab = params.get('tab')
  const urlDept = params.get('dept')

  const [activeTab, setActiveTab] = useState(urlDept || urlTab || DEPARTMENTS[0])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        window.api.listTasks({}),
        window.api.listUsers()
      ])
      if (tasksRes.success) setTasks(tasksRes.data)
      if (usersRes.success) setUsers(usersRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sync active tab with URL params
  useEffect(() => {
    if (urlTab === 'users') setActiveTab('users')
    else if (urlDept && DEPARTMENTS.includes(urlDept)) setActiveTab(urlDept)
  }, [urlDept, urlTab])

  async function handleTaskMove(taskId, newStatus) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    )
    const res = await window.api.updateTask(taskId, { status: newStatus })
    if (!res.success) {
      showToast(res.error || 'Erro ao mover tarefa.', 'error')
      loadData()
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
    showToast('Tarefa excluída.')
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
    showToast('Usuário salvo!')
  }

  function handleUserDeleted(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    showToast('Usuário excluído.')
  }

  const isDeptTab = DEPARTMENTS.includes(activeTab)
  const deptTasks = isDeptTab
    ? (filterPriority
        ? tasks.filter((t) => t.department === activeTab && t.priority === filterPriority)
        : tasks.filter((t) => t.department === activeTab))
    : []

  const nonAdminUsers = users.filter((u) => u.role !== 'admin')

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1>⚡ Painel Administrativo</h1>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>↻ Atualizar</button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            className={`admin-tab${activeTab === d ? ' active' : ''}`}
            onClick={() => setActiveTab(d)}
          >
            {DEPT_ICONS[d]} {d}
          </button>
        ))}
        <button
          className={`admin-tab${activeTab === 'users' ? ' active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuários
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
                + Nova Tarefa
              </button>

              <select
                className="form-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{ width: 'auto', minWidth: 140 }}
              >
                <option value="">Todas as prioridades</option>
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Média</option>
                <option value="baixa">🟢 Baixa</option>
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
                showDept={false}
                onTaskMove={handleTaskMove}
                onCardClick={(t) => setSelectedTask(t)}
              />
            )}
          </div>
        )}

        {/* Users management view */}
        {activeTab === 'users' && (
          <div>
            <div className="user-table-section">
              <div className="user-table-header">
                <h3>Usuários do Sistema</h3>
                <button className="btn btn-primary" onClick={() => setShowNewUser(true)}>
                  + Novo Usuário
                </button>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" /> Carregando usuários...
                </div>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Função</th>
                      <th>Departamento</th>
                      <th>Tarefas</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Admin row (non-editable) */}
                    {users.filter((u) => u.role === 'admin').map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              className="sidebar-avatar"
                              style={{ width: 30, height: 30, fontSize: 11 }}
                            >
                              {getInitials(u.username)}
                            </div>
                            <span className="font-bold">{u.username}</span>
                          </div>
                        </td>
                        <td><span className="role-badge admin">Administrador</span></td>
                        <td><span className="text-muted">—</span></td>
                        <td>
                          <span className="text-sm text-muted">
                            {tasks.filter((t) => t.createdBy === u.id).length} criadas
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          <span className="text-sm text-muted">—</span>
                        </td>
                      </tr>
                    ))}

                    {nonAdminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                          Nenhum usuário cadastrado. Clique em &quot;+ Novo Usuário&quot; para criar.
                        </td>
                      </tr>
                    ) : (
                      nonAdminUsers.map((u) => {
                        const userTasks = tasks.filter((t) => t.assignedTo === u.id)
                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  className="sidebar-avatar"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    fontSize: 11,
                                    background: DEPT_COLORS[u.department] || 'var(--primary)'
                                  }}
                                >
                                  {getInitials(u.username)}
                                </div>
                                <span className="font-bold">{u.username}</span>
                              </div>
                            </td>
                            <td><span className="role-badge user">Usuário</span></td>
                            <td>
                              <span
                                className="dept-badge"
                                style={{
                                  background: `${DEPT_COLORS[u.department]}15`,
                                  color: DEPT_COLORS[u.department]
                                }}
                              >
                                {DEPT_ICONS[u.department]} {u.department}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm">
                                {userTasks.length > 0
                                  ? `${userTasks.length} atribuída${userTasks.length !== 1 ? 's' : ''}`
                                  : '—'}
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
                                  ✏️
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

      {/* Task edit modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSaved={(s) => { handleTaskSaved(s); setSelectedTask(null) }}
          onDeleted={(id) => { handleTaskDeleted(id); setSelectedTask(null) }}
        />
      )}

      {/* New task modal */}
      {showNewTask && (
        <TaskModal
          defaultDept={isDeptTab ? activeTab : DEPARTMENTS[0]}
          users={users}
          onClose={() => setShowNewTask(false)}
          onSaved={(s) => { handleTaskSaved(s); setShowNewTask(false) }}
        />
      )}

      {/* Edit user modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={(s) => { handleUserSaved(s); setSelectedUser(null) }}
          onDeleted={(id) => { handleUserDeleted(id); setSelectedUser(null) }}
        />
      )}

      {/* New user modal */}
      {showNewUser && (
        <UserModal
          onClose={() => setShowNewUser(false)}
          onSaved={(s) => { handleUserSaved(s); setShowNewUser(false) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </>
  )
}
