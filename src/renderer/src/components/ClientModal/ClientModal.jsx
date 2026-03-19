import { useState } from 'react'
import { IconClose, IconTrash } from '../Icons/Icons'
import api from '../../api'
import { TIPO_OBRA_OPTIONS } from '../../lib/constants'
import ConfirmDeleteModal from '../ConfirmDeleteModal/ConfirmDeleteModal'

export default function ClientModal({ client, onClose, onSaved, onDeleted }) {
  const isEdit = !!client

  const [form, setForm] = useState({
    nome: client?.nome || '',
    dadosObra: client?.dadosObra || '',
    orc: client?.orc || '',
    tipoObra: client?.tipoObra || ''
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('O nome do cliente e obrigatorio.')
      return
    }
    setLoading(true)
    setError('')
    try {
      let res
      if (isEdit) {
        res = await api.updateClient(client.id, form)
      } else {
        res = await api.createClient(form)
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
      const res = await api.deleteClient(client.id)
      if (!res.success) {
        setError(res.error)
        setShowConfirmDelete(false)
      } else {
        onDeleted && onDeleted(client.id)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Erro ao excluir.')
      setShowConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <h2>{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <button className="btn-icon" onClick={onClose}><IconClose size={16} /></button>
          </div>

          <div className="modal-body">
            <form id="client-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome / Tomador *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  placeholder="Nome do cliente ou tomador"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dados da Obra (Local)</label>
                <input
                  className="form-input"
                  value={form.dadosObra}
                  onChange={(e) => set('dadosObra', e.target.value)}
                  placeholder="Local ou dados da obra"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ORC/OV/OS/CT-e</label>
                  <input
                    className="form-input"
                    value={form.orc}
                    onChange={(e) => set('orc', e.target.value)}
                    placeholder="ORC-2025-001"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Obra</label>
                  <select
                    className="form-select"
                    value={form.tipoObra}
                    onChange={(e) => set('tipoObra', e.target.value)}
                  >
                    <option value="">-- Selecionar --</option>
                    {TIPO_OBRA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}
            </form>
          </div>

          <div className="modal-footer">
            {isEdit && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowConfirmDelete(true)}
                disabled={deleting}
                style={{ marginRight: 'auto' }}
              >
                <IconTrash size={14} />
                Excluir
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              form="client-form"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Cliente'}
            </button>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmDeleteModal
          itemName={client.nome}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </>
  )
}
