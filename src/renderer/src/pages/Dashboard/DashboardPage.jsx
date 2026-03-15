import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard'
import TaskModal from '../../components/TaskModal/TaskModal'
import FollowUpModal from '../../components/FollowUpModal/FollowUpModal'
import { IconBolt, IconRefresh, IconPlus, DeptIcon } from '../../components/Icons/Icons'
import { DEPARTMENTS, DEPT_COLORS } from '../../lib/constants'

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [toast, setToast] = useState(null)
  const [pendingFollowUp, setPendingFollowUp] = useState(null)

  const isAdmin = user?.role === 'admin'
  const depts = user?.departments || []
  const deptTabs = isAdmin ? DEPARTMENTS : depts

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes, clientsRes] = await Promise.all([
        window.api.listTasks({}),
        window.api.listUsersBasic(),
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
      setPendingFollowUp({
        taskId,
        clientId: task?.clientId || null,
        serviceId: task?.serviceId || null,
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'media',
        department: task?.department || '',
        assignedTo: task?.assignedTo || null,
        dueDate: task?.dueDate || null
      })
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

    // Show follow-up modal when task is completed via modal
    if (saved.status === 'concluido') {
      setPendingFollowUp({
        taskId: saved.id,
        clientId: saved.clientId || null,
        serviceId: saved.serviceId || null,
        title: saved.title || '',
        description: saved.description || '',
        priority: saved.priority || 'media',
        department: saved.department || '',
        assignedTo: saved.assignedTo || null,
        dueDate: saved.dueDate || null
      })
    }
  }

  function handleTaskDeleted(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showToast('Tarefa excluida.')
  }

  async function handleArchiveTask(taskId) {
    const res = await window.api.archiveTask(taskId)
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      showToast('Tarefa arquivada!')
    } else {
      showToast(res.error || 'Erro ao arquivar.', 'error')
    }
  }

  async function handleArchiveFromFollowUp() {
    if (pendingFollowUp?.taskId) {
      await handleArchiveTask(pendingFollowUp.taskId)
    }
    setPendingFollowUp(null)
  }

  async function handleSendToSector(department) {
    if (!pendingFollowUp) return
    // Archive the original task
    if (pendingFollowUp.taskId) {
      await handleArchiveTask(pendingFollowUp.taskId)
    }
    // Create a new task in the new department
    const res = await window.api.createTask({
      title: pendingFollowUp.title,
      description: pendingFollowUp.description,
      priority: pendingFollowUp.priority,
      department,
      clientId: pendingFollowUp.clientId,
      serviceId: pendingFollowUp.serviceId,
      assignedTo: null,
      dueDate: pendingFollowUp.dueDate,
      status: 'pendente'
    })
    if (res.success) {
      setTasks((prev) => [res.data, ...prev])
      showToast(`Tarefa enviada para ${department}!`)
    } else {
      showToast(res.error || 'Erro ao criar tarefa.', 'error')
    }
    setPendingFollowUp(null)
  }

  // Dashboard shows non-archived tasks only
  let filteredTasks = tasks.filter((t) => !t.archived)
  if (filterDept) filteredTasks = filteredTasks.filter((t) => t.department === filterDept)
  if (filterPriority) filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority)

  // Build client map for kanban cards
  const clientMap = {}
  clients.forEach((c) => { clientMap[c.id] = c })

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1>
          {depts.length === 1 ? (
            <>
              <DeptIcon department={depts[0]} size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              {depts[0]}
            </>
          ) : depts.length > 1 ? (
            'Meus Departamentos'
          ) : (
            'Dashboard'
          )}
        </h1>
        <span className="page-header-dept">
          {isAdmin ? <><IconBolt size={13} /> Admin</> : depts.join(', ') || 'Geral'}
        </span>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="kanban-wrapper">
          {/* Toolbar */}
          <div className="kanban-toolbar">
            <button className="btn btn-primary" onClick={() => setShowNewTask(true)}>
              <IconPlus size={14} /> Nova Tarefa
            </button>

            {deptTabs.length > 1 && (
              <select
                className="form-select"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ width: 'auto', minWidth: 160 }}
              >
                <option value="">Todos os departamentos</option>
                {deptTabs.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

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
              {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
            </span>

            <button
              className="btn btn-ghost btn-sm"
              onClick={loadData}
              title="Atualizar"
              style={{ marginLeft: 'auto' }}
            >
              <IconRefresh size={14} /> Atualizar
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
              clientMap={clientMap}
              showDept={deptTabs.length > 1 && !filterDept}
              onTaskMove={handleTaskMove}
              onCardClick={(t) => setSelectedTask(t)}
              onArchiveTask={handleArchiveTask}
            />
          )}
        </div>
      </div>

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

      {showNewTask && (
        <TaskModal
          defaultDept={filterDept || depts[0]}
          users={users}
          onClose={() => setShowNewTask(false)}
          onSaved={(saved) => {
            handleTaskSaved(saved)
            setShowNewTask(false)
          }}
        />
      )}

      {pendingFollowUp && (
        <FollowUpModal
          onArchive={handleArchiveFromFollowUp}
          onSendToSector={handleSendToSector}
          onClose={() => setPendingFollowUp(null)}
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
