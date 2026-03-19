import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import TaskModal from '../../components/TaskModal/TaskModal'
import ClientModal from '../../components/ClientModal/ClientModal'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal/ConfirmDeleteModal'
import FollowUpModal from '../../components/FollowUpModal/FollowUpModal'
import { IconChevronLeft, IconPlus, IconRefresh, IconEdit, IconTrash, IconCheck, IconClock } from '../../components/Icons/Icons'
import { DEPT_COLORS } from '../../lib/constants'
import { canManageClients } from '../../lib/permissions'
import PriorityBadge from '../../components/PriorityBadge/PriorityBadge'

const STATUS_LABELS = { pendente: 'Pendente', 'em-andamento': 'Em Andamento', concluido: 'Concluido' }

function formatDuration(createdAt, completedAt) {
  if (!createdAt || !completedAt) return null
  const ms = new Date(completedAt) - new Date(createdAt)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} dia${days !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hora${hours !== 1 ? 's' : ''}`
  return 'menos de 1 hora'
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [tasks, setTasks] = useState([])
  const [services, setServices] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditClient, setShowEditClient] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [activeServiceTab, setActiveServiceTab] = useState(null)
  const [toast, setToast] = useState(null)
  const [newServiceName, setNewServiceName] = useState('')
  const [creatingService, setCreatingService] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [editServiceName, setEditServiceName] = useState('')
  const [confirmDeleteService, setConfirmDeleteService] = useState(null)
  const [pendingFollowUp, setPendingFollowUp] = useState(null)
  const [followUpDefaults, setFollowUpDefaults] = useState(null)

  const canManage = canManageClients(user)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [clientRes, tasksRes, usersRes, servicesRes] = await Promise.all([
        api.getClient(clientId),
        api.listTasks({}),
        api.listUsersBasic(),
        api.listServices(clientId)
      ])
      if (clientRes.success) setClient(clientRes.data)
      if (tasksRes.success) setTasks(tasksRes.data.filter((t) => t.clientId === clientId))
      if (usersRes.success) setUsers(usersRes.data)
      if (servicesRes.success) setServices(servicesRes.data)
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

    if (saved.status === 'concluido' && saved.clientId) {
      setPendingFollowUp({ clientId: saved.clientId, originalTitle: saved.title })
    }
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

  async function handleCreateService() {
    if (!newServiceName.trim()) return
    setCreatingService(true)
    try {
      const res = await api.createService({ clientId, nome: newServiceName.trim() })
      if (res.success) {
        setServices((prev) => [res.data, ...prev])
        setNewServiceName('')
        setShowAddService(false)
        setActiveServiceTab(res.data.id)
        showToast('Servico criado!')
      } else {
        showToast(res.error, 'error')
      }
    } finally {
      setCreatingService(false)
    }
  }

  async function handleCompleteService(svc) {
    const newStatus = svc.status === 'concluido' ? 'ativo' : 'concluido'
    const res = await api.updateService(svc.id, { status: newStatus })
    if (res.success) {
      setServices((prev) => prev.map((s) => (s.id === svc.id ? res.data : s)))
      showToast(newStatus === 'concluido' ? 'Servico concluido!' : 'Servico reaberto!')
    } else {
      showToast(res.error, 'error')
    }
  }

  async function handleRenameService() {
    if (!editServiceName.trim() || !editingService) return
    const res = await api.updateService(editingService, { nome: editServiceName.trim() })
    if (res.success) {
      setServices((prev) => prev.map((s) => (s.id === editingService ? res.data : s)))
      setEditingService(null)
      showToast('Servico renomeado!')
    } else {
      showToast(res.error, 'error')
    }
  }

  async function handleDeleteService() {
    if (!confirmDeleteService) return
    const res = await api.deleteService(confirmDeleteService)
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.id !== confirmDeleteService))
      setTasks((prev) => prev.filter((t) => t.serviceId !== confirmDeleteService))
      if (activeServiceTab === confirmDeleteService) setActiveServiceTab(null)
      setConfirmDeleteService(null)
      showToast('Servico excluido.')
    } else {
      showToast(res.error, 'error')
      setConfirmDeleteService(null)
    }
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

  // Determine which tasks to show based on active tab
  const activeServices = services.filter((s) => s.status === 'ativo')
  const doneServices = services.filter((s) => s.status === 'concluido')

  let currentTasks
  let currentService = null
  if (activeServiceTab === '__none__') {
    currentTasks = tasks.filter((t) => !t.serviceId)
  } else if (activeServiceTab) {
    currentService = services.find((s) => s.id === activeServiceTab)
    currentTasks = tasks.filter((t) => t.serviceId === activeServiceTab)
  } else {
    currentTasks = tasks
  }

  const activeTasks = currentTasks.filter((t) => t.status !== 'concluido')
  const doneTasks = currentTasks.filter((t) => t.status === 'concluido')

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
            {client.dadosObra && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Dados da Obra: </span>
                <span className="client-detail-info-value">{client.dadosObra}</span>
              </div>
            )}
            {client.orc && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">ORC/OV/OSS: </span>
                <span className="client-detail-info-value">{client.orc}</span>
              </div>
            )}
            {client.tipoObra && (
              <div className="client-detail-info-item">
                <span className="client-detail-info-label">Tipo de Obra: </span>
                <span className="client-detail-info-value">{client.tipoObra}</span>
              </div>
            )}
          </div>
        </div>

        {/* Service tabs */}
        <div className="service-tabs">
          <button
            className={`service-tab${activeServiceTab === null ? ' active' : ''}`}
            onClick={() => setActiveServiceTab(null)}
          >
            Todas ({tasks.length})
          </button>
          {activeServices.map((svc) => (
            <button
              key={svc.id}
              className={`service-tab${activeServiceTab === svc.id ? ' active' : ''}`}
              onClick={() => setActiveServiceTab(svc.id)}
            >
              {svc.nome}
            </button>
          ))}
          {doneServices.map((svc) => (
            <button
              key={svc.id}
              className={`service-tab done${activeServiceTab === svc.id ? ' active' : ''}`}
              onClick={() => setActiveServiceTab(svc.id)}
              title="Servico concluido"
            >
              <IconCheck size={12} /> {svc.nome}
            </button>
          ))}
          <button
            className={`service-tab${activeServiceTab === '__none__' ? ' active' : ''}`}
            onClick={() => setActiveServiceTab('__none__')}
          >
            Sem Servico
          </button>
          {canManage && (
            <button
              className="service-tab add"
              onClick={() => setShowAddService(true)}
              title="Novo servico"
            >
              <IconPlus size={12} />
            </button>
          )}
        </div>

        {/* Add service inline */}
        {showAddService && (
          <div className="service-add-bar">
            <input
              className="form-input"
              placeholder="Nome do servico..."
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateService()}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleCreateService} disabled={creatingService}>
              {creatingService ? 'Criando...' : 'Criar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddService(false); setNewServiceName('') }}>
              Cancelar
            </button>
          </div>
        )}

        {/* Service header when a specific service is selected */}
        {currentService && (
          <div className="service-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingService === currentService.id ? (
                <>
                  <input
                    className="form-input"
                    value={editServiceName}
                    onChange={(e) => setEditServiceName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameService(); if (e.key === 'Escape') setEditingService(null) }}
                    onBlur={handleRenameService}
                    autoFocus
                    style={{ width: 200 }}
                  />
                </>
              ) : (
                <>
                  <h3 style={{ margin: 0 }}>{currentService.nome}</h3>
                  <span className={`service-status-badge ${currentService.status}`}>
                    {currentService.status === 'concluido' ? 'Concluido' : 'Ativo'}
                  </span>
                </>
              )}
            </div>
            {canManage && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCompleteService(currentService)}
                >
                  {currentService.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEditingService(currentService.id); setEditServiceName(currentService.nome) }}
                >
                  <IconEdit size={13} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmDeleteService(currentService.id)}
                  style={{ color: 'var(--danger)' }}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tasks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Tarefas ({currentTasks.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewTask(true)}>
            <IconPlus size={14} /> Nova Tarefa
          </button>
        </div>

        {currentTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
            Nenhuma tarefa nesta secao.
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
                  <TaskRow key={t.id} task={t} users={users} onClick={() => setSelectedTask(t)} showTiming />
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
        />
      )}

      {showNewTask && (
        <TaskModal
          defaultClientId={clientId}
          defaultServiceId={activeServiceTab && activeServiceTab !== '__none__' ? activeServiceTab : undefined}
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
          onArchive={() => setPendingFollowUp(null)}
          onFollowUp={() => {
            setFollowUpDefaults({ clientId: pendingFollowUp.clientId, originalTitle: pendingFollowUp.originalTitle })
            setPendingFollowUp(null)
          }}
          onClose={() => setPendingFollowUp(null)}
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

      {confirmDeleteService && (
        <ConfirmDeleteModal
          itemName={services.find((s) => s.id === confirmDeleteService)?.nome || 'servico'}
          onClose={() => setConfirmDeleteService(null)}
          onConfirm={handleDeleteService}
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

function formatOpenTime(createdAt) {
  if (!createdAt) return null
  const ms = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} dia${days !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hora${hours !== 1 ? 's' : ''}`
  return 'menos de 1 hora'
}

function TaskRow({ task, users, onClick, showTiming = false }) {
  const assignedIds = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : []
  const assignees = users.filter((u) => assignedIds.includes(u.id))
  const duration = showTiming ? formatDuration(task.createdAt, task.completedAt) : null
  const openTime = !showTiming ? formatOpenTime(task.createdAt) : null
  return (
    <div className="client-task-row" onClick={onClick}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
        <div className="text-sm text-muted" style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
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
          {assignees.length > 0 && <span>@ {assignees.map((a) => a.username).join(', ')}</span>}
          {openTime && (
            <span className="task-timing">
              <IconClock size={11} /> Aberta ha {openTime}
            </span>
          )}
          {duration && (
            <span className="task-timing">
              <IconClock size={11} /> Concluida em {duration}
            </span>
          )}
          {showTiming && task.completedAt && (
            <span className="task-timing">
              {new Date(task.completedAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
    </div>
  )
}
