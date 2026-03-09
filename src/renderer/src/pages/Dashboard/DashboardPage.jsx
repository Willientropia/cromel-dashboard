import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard'
import TaskModal from '../../components/TaskModal/TaskModal'

const DEPT_ICONS = {
  Financeiro: '💰',
  Engenharia: '⚙️',
  Laboratorio: '🔬'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [toast, setToast] = useState(null)

  const dept = user?.department

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        window.api.listTasks({}),
        window.api.listUsers().catch(() => ({ success: true, data: [] }))
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

  async function handleTaskMove(taskId, newStatus) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    )
    const res = await window.api.updateTask(taskId, { status: newStatus })
    if (!res.success) {
      showToast(res.error || 'Erro ao mover tarefa.', 'error')
      loadData() // revert
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
    showToast('Tarefa salva com sucesso!')
  }

  function handleTaskDeleted(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showToast('Tarefa excluída.')
  }

  const filteredTasks = filterPriority
    ? tasks.filter((t) => t.priority === filterPriority)
    : tasks

  const isAdmin = user?.role === 'admin'

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1>
          {dept ? `${DEPT_ICONS[dept] || '📋'} ${dept}` : 'Dashboard'}
        </h1>
        <span className="page-header-dept">
          {isAdmin ? '⚡ Admin' : dept || 'Geral'}
        </span>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="kanban-wrapper">
          {/* Toolbar */}
          <div className="kanban-toolbar">
            <button className="btn btn-primary" onClick={() => setShowNewTask(true)}>
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
              {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
            </span>

            <button
              className="btn btn-ghost btn-sm"
              onClick={loadData}
              title="Atualizar"
              style={{ marginLeft: 'auto' }}
            >
              ↻ Atualizar
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              Carregando tarefas...
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              users={users}
              showDept={false}
              onTaskMove={handleTaskMove}
              onCardClick={(t) => setSelectedTask(t)}
            />
          )}
        </div>
      </div>

      {/* Edit task modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSaved={(saved) => {
            handleTaskSaved(saved)
            setSelectedTask(null)
          }}
          onDeleted={(id) => {
            handleTaskDeleted(id)
            setSelectedTask(null)
          }}
        />
      )}

      {/* New task modal */}
      {showNewTask && (
        <TaskModal
          defaultDept={dept}
          users={users}
          onClose={() => setShowNewTask(false)}
          onSaved={(saved) => {
            handleTaskSaved(saved)
            setShowNewTask(false)
          }}
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
