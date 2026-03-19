import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import CommentSection from '../CommentSection/CommentSection'
import DatePicker from '../DatePicker/DatePicker'
import { IconClose, IconTrash, IconCalendar } from '../Icons/Icons'
import { DEPARTMENTS, STATUSES, PRIORITIES } from '../../lib/constants'

export default function TaskModal({
  task,
  defaultDept,
  defaultClientId,
  defaultServiceId,
  users = [],
  onClose,
  onSaved,
  onDeleted
}) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!task

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pendente',
    priority: task?.priority || 'media',
    department:
      task?.department ||
      defaultDept ||
      (isAdmin ? DEPARTMENTS[0] : user?.departments?.[0]) ||
      DEPARTMENTS[0],
    assignedTo: Array.isArray(task?.assignedTo) ? task.assignedTo : task?.assignedTo ? [task.assignedTo] : [],
    dueDate: task?.dueDate || '',
    clientId: task?.clientId || defaultClientId || '',
    serviceId: task?.serviceId || defaultServiceId || ''
  })
  const [comments, setComments] = useState(task?.comments || [])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])

  useEffect(() => {
    api.listClients().then((res) => {
      if (res.success) setClients(res.data)
    })
  }, [])

  useEffect(() => {
    if (form.clientId) {
      api.listServices(form.clientId).then((res) => {
        if (res.success) setServices(res.data)
      })
    } else {
      setServices([])
      setForm((f) => ({ ...f, serviceId: '' }))
    }
  }, [form.clientId])

  const deptUsers = users.filter(
    (u) => u.departments?.includes(form.department) && u.role !== 'admin'
  )

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'department') {
      setForm((f) => ({ ...f, department: value, assignedTo: [] }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('O titulo e obrigatorio.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        assignedTo: form.assignedTo.length > 0 ? form.assignedTo : null,
        dueDate: form.dueDate || null,
        clientId: form.clientId || null,
        serviceId: form.serviceId || null
      }
      let res
      if (isEdit) {
        res = await api.updateTask(task.id, payload)
      } else {
        res = await api.createTask(payload)
      }
      if (!res.success) {
        setError(res.error)
      } else {
        onSaved && onSaved(res.data)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await api.deleteTask(task.id)
      if (!res.success) {
        setError(res.error)
      } else {
        onDeleted && onDeleted(task.id)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  function handleCommentAdded(comment) {
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev
      return [...prev, comment]
    })
  }

  const canDelete = isAdmin && isEdit

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button className="btn-icon" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div className="modal-body">
          {isEdit && task.createdAt && (
            <div className="task-meta-bar">
              <span className="task-meta-item">
                <IconCalendar size={13} />
                Criada em {new Date(task.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <form id="task-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={form.clientId}
                onChange={(e) => set('clientId', e.target.value)}
              >
                <option value="">-- Selecionar cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.dadosObra ? `(${c.dadosObra})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {form.clientId && services.length > 0 && (
              <div className="form-group">
                <label className="form-label">Servico</label>
                <select
                  className="form-select"
                  value={form.serviceId}
                  onChange={(e) => set('serviceId', e.target.value)}
                >
                  <option value="">-- Sem servico --</option>
                  {services.filter((s) => s.status === 'ativo').map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Titulo *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Descreva a tarefa..."
                maxLength={120}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descricao</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Detalhes adicionais sobre a tarefa..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <select
                  className="form-select"
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Atribuir para</label>
                {deptUsers.length === 0 ? (
                  <p className="text-sm text-muted" style={{ margin: 0 }}>Nenhum usuario neste departamento.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {deptUsers.map((u) => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={form.assignedTo.includes(u.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.assignedTo, u.id]
                              : form.assignedTo.filter((id) => id !== u.id)
                            set('assignedTo', next)
                          }}
                        />
                        {u.username}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Data limite de entrega</label>
              <DatePicker
                value={form.dueDate}
                onChange={(val) => set('dueDate', val)}
                placeholder="Selecionar prazo..."
              />
            </div>

            {error && <p className="form-error">{error}</p>}
          </form>

          {isEdit && (
            <CommentSection
              taskId={task.id}
              comments={comments}
              users={users}
              onCommentAdded={handleCommentAdded}
            />
          )}
        </div>

        <div className="modal-footer">
          {canDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{ marginRight: 'auto' }}
            >
              <IconTrash size={14} />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="task-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  )
}
