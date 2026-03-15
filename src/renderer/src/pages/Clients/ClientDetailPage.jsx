import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TaskModal from '../../components/TaskModal/TaskModal'
import ClientModal from '../../components/ClientModal/ClientModal'
import { IconChevronLeft, IconPlus, IconRefresh, IconEdit } from '../../components/Icons/Icons'
import { DEPT_COLORS } from '../../lib/constants'
import { canManageClients } from '../../lib/permissions'
import PriorityBadge from '../../components/PriorityBadge/PriorityBadge'

const STATUS_LABELS = { pendente: 'Pendente', 'em-andamento': 'Em Andamento', concluido: 'Concluido' }

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditClient, setShowEditClient] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [followUpDefaults, setFollowUpDefaults] = useState(null)
  const [toast, setToast] = useState(null)

  const canManage = canManageClients(user)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [clientRes, tasksRes, usersRes] = await Promise.all([
        window.api.getClient(clientId),
        window.api.listTasks({}),
        window.api.listUsersBasic()
      ])
      if (clientRes.success) setClient(clientRes.data)
      if (tasksRes.success) setTasks(tasksRes.data.filter((t) => t.clientId === clientId))
      if (usersRes.success) setUsers(usersRes.data)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleTaskSaved(saved) {
    setTasks((prev) => {
      if (saved.clientId !== clientId) {
        return prev.filter((t) => t.id !== saved.id)
      }
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

  function handleClientSaved(saved) {
    setClient(saved)
    showToast('Cliente atualizado!')
  }

  function handleClientDeleted() {
    navigate('/clients')
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        Carregando...
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
        Cliente nao encontrado.
        <br />
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate('/clients')}>
          Voltar
        </button>
      </div>
    )
  }

  const activeTasks = tasks.filter((t) => t.status !== 'concluido')
  const doneTasks = tasks.filter((t) => t.status === 'concluido')

  return (
    <>
      <div className="page-header">
        <h1>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/clients')}
            style={{ marginRight: 8 }}
          >
            <IconChevronLeft size={14} /> Clientes
          </button>
          {client.nome}
        </h1>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <IconRefresh size={14} /> Atualizar
        </button>
      </div>

      <div className="page-content">
        {/* Client info */}
        <div className="client-detail-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="client-detail-name">{client.nome}</div>
            {canManage && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditClient(true)}>
                <IconEdit size={14} /> Editar
              </button>
            )}
          </div>
          <div className="client-detail-info">
            {client.cidade && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Cidade: </span>
                <span className="client-detail-info-value">{client.cidade}</span>
              </div>
            )}
            {client.empresa && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Empresa: </span>
                <span className="client-detail-info-value">{client.empresa}</span>
              </div>
            )}
            {client.telefone && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Telefone: </span>
                <span className="client-detail-info-value">{client.telefone}</span>
              </div>
            )}
            {client.endereco && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Endereco: </span>
                <span className="client-detail-info-value">{client.endereco}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Tarefas ({tasks.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewTask(true)}>
            <IconPlus size={14} /> Nova Tarefa
          </button>
        </div>

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
            Nenhuma tarefa vinculada a este cliente.
          </div>
        ) : (
          <div className="client-task-list">
            {activeTasks.length > 0 && (
              <>
                <div className="text-sm text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                  Ativas ({activeTasks.length})
                </div>
                {activeTasks.map((t) => (
                  <TaskRow key={t.id} task={t} users={users} onClick={() => setSelectedTask(t)} />
                ))}
              </>
            )}
            {doneTasks.length > 0 && (
              <>
                <div className="text-sm text-muted" style={{ marginBottom: 8, marginTop: 16, fontWeight: 600 }}>
                  Concluidas ({doneTasks.length})
                </div>
                {doneTasks.map((t) => (
                  <TaskRow key={t.id} task={t} users={users} onClick={() => setSelectedTask(t)} />
                ))}
              </>
            )}
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
          defaultClientId={clientId}
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

      {showEditClient && (
        <ClientModal
          client={client}
          onClose={() => setShowEditClient(false)}
          onSaved={(s) => { handleClientSaved(s); setShowEditClient(false) }}
          onDeleted={() => handleClientDeleted()}
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

function TaskRow({ task, users, onClick }) {
  const assignee = users.find((u) => u.id === task.assignedTo)
  return (
    <div className="client-task-row" onClick={onClick}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
        <div className="text-sm text-muted" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <span
            className="dept-badge"
            style={{
              background: `${DEPT_COLORS[task.department]}15`,
              color: DEPT_COLORS[task.department],
              fontSize: 11
            }}
          >
            {task.department}
          </span>
          <span>{STATUS_LABELS[task.status] || task.status}</span>
          {assignee && <span>@ {assignee.username}</span>}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
    </div>
  )
}
