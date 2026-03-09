import { useState } from 'react'

const DEPARTMENTS = ['Financeiro', 'Engenharia', 'Laboratorio']

export default function UserModal({ user, onClose, onSaved, onDeleted }) {
  const isEdit = !!user

  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    department: user?.department || 'Financeiro'
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim()) {
      setError('O nome de usuário é obrigatório.')
      return
    }
    if (!isEdit && !form.password) {
      setError('A senha é obrigatória.')
      return
    }
    setLoading(true)
    setError('')
    try {
      let res
      if (isEdit) {
        const updates = { username: form.username, department: form.department }
        if (form.password) updates.password = form.password
        res = await window.api.updateUser(user.id, updates)
      } else {
        res = await window.api.createUser({
          username: form.username,
          password: form.password,
          department: form.department
        })
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
    if (!window.confirm(`Excluir o usuário "${user.username}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      const res = await window.api.deleteUser(user.id)
      if (!res.success) {
        setError(res.error)
      } else {
        onDeleted && onDeleted(user.id)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form id="user-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nome de usuário *</label>
              <input
                className="form-input"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="ex: joao.silva"
                maxLength={40}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Senha {isEdit && <span className="text-muted">(deixe em branco para manter)</span>}
              </label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Mínimo 4 caracteres'}
                autoComplete="new-password"
              />
            </div>

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

            {error && <p className="form-error">{error}</p>}
          </form>
        </div>

        <div className="modal-footer">
          {isEdit && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{ marginRight: 'auto' }}
            >
              {deleting ? 'Excluindo...' : '🗑 Excluir'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}
