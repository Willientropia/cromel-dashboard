import { useState } from 'react'
import { IconClose, IconTrash, IconWarning } from '../Icons/Icons'

export default function ConfirmDeleteModal({ itemName, onConfirm, onClose, loading }) {
  const [input, setInput] = useState('')
  const CONFIRM_TEXT = 'eu quero excluir'
  const isMatch = input.trim().toLowerCase() === CONFIRM_TEXT

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Confirmar Exclusao</h2>
          <button className="btn-icon" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="confirm-delete-warning">
            <IconWarning size={24} />
            <p>Voce esta prestes a excluir <strong>{itemName}</strong>.</p>
            <p>Esta acao nao pode ser desfeita.</p>
          </div>
          <div className="form-group">
            <label className="form-label">
              Digite <strong>eu quero excluir</strong> para confirmar:
            </label>
            <input
              className="form-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="eu quero excluir"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={!isMatch || loading}
          >
            <IconTrash size={14} />
            {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
          </button>
        </div>
      </div>
    </div>
  )
}
