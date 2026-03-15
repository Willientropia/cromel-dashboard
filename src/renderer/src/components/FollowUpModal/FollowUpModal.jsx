import { useState } from 'react'
import { IconCheck } from '../Icons/Icons'
import { DEPARTMENTS } from '../../lib/constants'

export default function FollowUpModal({ onArchive, onSendToSector, onClose }) {
  const [showDeptPicker, setShowDeptPicker] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal follow-up-modal" onClick={(e) => e.stopPropagation()}>
        <div className="follow-up-modal-body">
          <div className="follow-up-icon">
            <IconCheck size={32} />
          </div>
          <h3>Tarefa concluida!</h3>
          <p>O que deseja fazer agora?</p>

          {!showDeptPicker ? (
            <div className="follow-up-actions">
              <button className="btn btn-primary" onClick={() => setShowDeptPicker(true)}>
                Enviar para proximo setor
              </button>
              <button className="btn btn-secondary" onClick={onArchive}>
                Arquivar tarefa
              </button>
            </div>
          ) : (
            <div className="follow-up-dept-picker">
              <p className="text-sm" style={{ marginBottom: 8, fontWeight: 600 }}>
                Selecione o departamento:
              </p>
              <div className="follow-up-dept-grid">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    className="btn btn-outline follow-up-dept-btn"
                    onClick={() => onSendToSector(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-ghost follow-up-cancel"
                onClick={() => setShowDeptPicker(false)}
              >
                Voltar
              </button>
            </div>
          )}

          <button className="btn btn-ghost follow-up-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
