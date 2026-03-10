import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import PriorityBadge from '../PriorityBadge/PriorityBadge'
import { IconComment, IconGripVertical } from '../Icons/Icons'

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

export default function KanbanCard({ task, users = [], showDept = false, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1
  }

  const assignedUser = users.find((u) => u.id === task.assignedTo)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' dragging' : ''}`}
      onClick={() => !isDragging && onClick && onClick(task)}
    >
      {/* Drag handle */}
      <span className="kanban-card-drag-handle" {...listeners} {...attributes} title="Arrastar">
        <IconGripVertical size={14} />
      </span>

      {/* Title */}
      <div className="kanban-card-header">
        <span className="kanban-card-title">{task.title}</span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="kanban-card-description">{task.description}</p>
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
            <div
              className="kanban-card-assignee"
              title={assignedUser.username}
            >
              {getInitials(assignedUser.username)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
