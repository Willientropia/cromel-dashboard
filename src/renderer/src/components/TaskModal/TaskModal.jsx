import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import CommentSection from '../CommentSection/CommentSection'
import DatePicker from '../DatePicker/DatePicker'
import { IconClose, IconTrash, IconCalendar } from '../Icons/Icons'

const DEPARTMENTS = ['Financeiro', 'Engenharia', 'Laboratorio']
const STATUSES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em-andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluido' }
]
const PRIORITIES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' }
]

export default function TaskModal({ task, defaultDept, users = [], onClose, onSaved, onDeleted }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!task

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pendente',
    priority: task?.priority || 'media',
    department: task?.department || defaultDept || (isAdmin ? 'Financeiro' : user?.department) || 'Financeiro',
    assignedTo: task?.assignedTo || '',
    dueDate: task?.dueDate || ''
  })
  const [comments, setComments] = useState(task?.comments || [])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const deptUsers = users.filter((u) => u.department === form.department && u.role === 'user')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'department') {
      setForm((f) => ({ ...f, department: value, assignedTo: '' }))
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
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null
      }
      let res
      if (isEdit) {
        res = await window.api.updateTask(task.id, payload)
      } else {
        res = await window.api.createTask(payload)
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
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return
    setDeleting(true)
    try {
      const res = await window.api.deleteTask(task.id)
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
  const canEditDept = isAdmin

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
                  disabled={!canEditDept}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Atribuir para</label>
                <select
                  className="form-select"
                  value={form.assignedTo}
                  onChange={(e) => set('assignedTo', e.target.value)}
                >
                  <option value="">&mdash; Nao atribuido &mdash;</option>
                  {deptUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
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
