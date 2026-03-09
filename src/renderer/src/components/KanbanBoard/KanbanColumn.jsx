import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'

const COLUMN_META = {
  pendente: {
    label: 'Pendente',
    className: 'pending',
    empty: { icon: '📋', text: 'Nenhuma tarefa pendente' }
  },
  'em-andamento': {
    label: 'Em Andamento',
    className: 'progress',
    empty: { icon: '🔄', text: 'Nenhuma tarefa em andamento' }
  },
  concluido: {
    label: 'Concluído',
    className: 'done',
    empty: { icon: '✅', text: 'Nenhuma tarefa concluída' }
  }
}

export default function KanbanColumn({ status, tasks, users, showDept, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const meta = COLUMN_META[status]

  return (
    <div className={`kanban-column${isOver ? ' drag-over' : ''}`}>
      <div className={`kanban-column-header ${meta.className}`}>
        <span className={`kanban-column-dot ${meta.className}`} />
        <span className={`kanban-column-title ${meta.className}`}>{meta.label}</span>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="kanban-column-body">
        {tasks.length === 0 ? (
          <div className="kanban-column-empty">
            <span>{meta.empty.icon}</span>
            <span>{meta.empty.text}</span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              users={users}
              showDept={showDept}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
