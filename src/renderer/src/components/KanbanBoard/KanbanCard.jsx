import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import PriorityBadge from '../PriorityBadge/PriorityBadge'
import { IconComment, IconGripVertical, IconClock, IconCheck } from '../Icons/Icons'

function getInitials(username) {
  if (!username) return '?'
  return username
    .split(/[._-]/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function getDueDateInfo(dueDateStr) {
  if (!dueDateStr) return null
  const [y, m, d] = dueDateStr.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  due.setHours(23, 59, 59, 999)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return { label: `${absDays}d atrasado`, className: 'overdue' }
  }
  if (diffDays === 0) return { label: 'Vence hoje', className: 'due-today' }
  if (diffDays === 1) return { label: 'Vence amanha', className: 'due-soon' }
  if (diffDays <= 3) return { label: `Faltam ${diffDays} dias`, className: 'due-soon' }
  return { label: `Faltam ${diffDays} dias`, className: 'due-normal' }
}

function formatDuration(createdAt, completedAt) {
  if (!createdAt || !completedAt) return null
  const ms = new Date(completedAt) - new Date(createdAt)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return '<1h'
}

export default function KanbanCard({ task, users = [], clientMap = {}, showDept = false, onClick, onArchive }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1
  }

  const assignedUser = users.find((u) => u.id === task.assignedTo)
  const clientName = task.clientId && clientMap[task.clientId] ? clientMap[task.clientId].nome : null
  const dueInfo = task.status !== 'concluido' ? getDueDateInfo(task.dueDate) : null
  const isCompleted = task.status === 'concluido'
  const duration = isCompleted ? formatDuration(task.createdAt, task.completedAt) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' dragging' : ''}${isCompleted ? ' completed' : ''}`}
      onClick={() => !isDragging && onClick && onClick(task)}
    >
      {/* Drag handle */}
      <span className="kanban-card-drag-handle" {...listeners} {...attributes} title="Arrastar">
        <IconGripVertical size={14} />
      </span>

      {/* Client label */}
      {clientName && <span className="kanban-card-client">{clientName}</span>}

      {/* Title */}
      <div className="kanban-card-header">
        <span className="kanban-card-title">{task.title}</span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="kanban-card-description">{task.description}</p>
      )}

      {/* Due date badge */}
      {dueInfo && (
        <div className={`kanban-card-due ${dueInfo.className}`}>
          <IconClock size={12} />
          <span>{dueInfo.label}</span>
        </div>
      )}

      {/* Completed timing */}
      {isCompleted && duration && (
        <div className="kanban-card-timing">
          <IconClock size={12} />
          <span>Concluida em {duration}</span>
        </div>
      )}

      {/* Footer */}
      <div className="kanban-card-footer">
        <div className="kanban-card-meta">
          <PriorityBadge priority={task.priority} />
          {showDept && <span className="kanban-card-dept">{task.department}</span>}
        </div>

        <div className="kanban-card-meta" style={{ gap: '8px' }}>
          {task.comments.length > 0 && (
            <span className="kanban-card-comments" title="Comentarios">
              <IconComment size={13} />
              <span>{task.comments.length}</span>
            </span>
          )}
          <span className="text-sm text-muted" title={task.updatedAt}>
            {timeAgo(task.updatedAt)}
          </span>
          {assignedUser && (
            assignedUser.photo ? (
              <img
                src={assignedUser.photo}
                alt={assignedUser.username}
                className="kanban-card-assignee-img"
                title={assignedUser.username}
              />
            ) : (
              <div
                className="kanban-card-assignee"
                title={assignedUser.username}
              >
                {getInitials(assignedUser.username)}
              </div>
            )
          )}
        </div>
      </div>

      {/* Archive button for completed tasks */}
      {isCompleted && onArchive && (
        <button
          className="btn btn-sm kanban-card-archive-btn"
          onClick={(e) => {
            e.stopPropagation()
            onArchive(task.id)
          }}
          title="Arquivar tarefa"
        >
          <IconCheck size={12} /> Arquivar
        </button>
      )}
    </div>
  )
}
