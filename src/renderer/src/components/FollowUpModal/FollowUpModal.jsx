import { IconCheck } from '../Icons/Icons'

export default function FollowUpModal({ onArchive, onFollowUp, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal follow-up-modal" onClick={(e) => e.stopPropagation()}>
        <div className="follow-up-modal-body">
          <div className="follow-up-icon">
            <IconCheck size={32} />
          </div>
          <h3>Tarefa concluida!</h3>
          <p>O que deseja fazer agora?</p>
          <div className="follow-up-actions">
            <button className="btn btn-primary" onClick={onArchive}>
              Concluir e Arquivar
            </button>
            <button className="btn btn-secondary" onClick={onFollowUp}>
              Criar tarefa de acompanhamento
            </button>
          </div>
          <button className="btn btn-ghost follow-up-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
