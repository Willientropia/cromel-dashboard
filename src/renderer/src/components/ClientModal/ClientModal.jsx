import { useState } from 'react'
import { IconClose, IconTrash } from '../Icons/Icons'
import ConfirmDeleteModal from '../ConfirmDeleteModal/ConfirmDeleteModal'

export default function ClientModal({ client, onClose, onSaved, onDeleted }) {
  const isEdit = !!client

  const [form, setForm] = useState({
    nome: client?.nome || '',
    cidade: client?.cidade || '',
    empresa: client?.empresa || '',
    telefone: client?.telefone || '',
    endereco: client?.endereco || ''
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
        res = await window.api.updateClient(client.id, form)
      } else {
        res = await window.api.createClient(form)
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
      const res = await window.api.deleteClient(client.id)
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
                <label className="form-label">Nome *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  placeholder="Nome do cliente"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input
                    className="form-input"
                    value={form.cidade}
                    onChange={(e) => set('cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa</label>
                  <input
                    className="form-input"
                    value={form.empresa}
                    onChange={(e) => set('empresa', e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    value={form.telefone}
                    onChange={(e) => set('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Endereco</label>
                  <input
                    className="form-input"
                    value={form.endereco}
                    onChange={(e) => set('endereco', e.target.value)}
                    placeholder="Endereco completo"
                  />
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
