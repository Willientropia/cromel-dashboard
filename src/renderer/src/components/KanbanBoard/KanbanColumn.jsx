import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'
import { IconClipboard, IconClock, IconCheck } from '../Icons/Icons'

const DEFAULT_LABELS = {
  pendente: 'Pendente',
  'em-andamento': 'Em Andamento',
  concluido: 'Concluido'
}

const COLUMN_META = {
  pendente: {
    className: 'pending',
    Icon: IconClipboard,
    emptyText: 'Nenhuma tarefa pendente'
  },
  'em-andamento': {
    className: 'progress',
    Icon: IconClock,
    emptyText: 'Nenhuma tarefa em andamento'
  },
  concluido: {
    className: 'done',
    Icon: IconCheck,
    emptyText: 'Nenhuma tarefa concluida'
  }
}

function getStoredLabel(status) {
  try {
    const stored = localStorage.getItem(`kanban-label-${status}`)
    return stored || DEFAULT_LABELS[status]
  } catch {
    return DEFAULT_LABELS[status]
  }
}

export default function KanbanColumn({ status, tasks, users, clientMap = {}, showDept, onCardClick, onArchiveTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const meta = COLUMN_META[status]
  const [label, setLabel] = useState(() => getStoredLabel(status))
  const [editing, setEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleDoubleClick() {
    setEditing(true)
  }

  function handleLabelChange(e) {
    setLabel(e.target.value)
  }

  function commitLabel() {
    const trimmed = label.trim()
    if (trimmed) {
      setLabel(trimmed)
      try {
        localStorage.setItem(`kanban-label-${status}`, trimmed)
      } catch {}
    } else {
      const def = DEFAULT_LABELS[status]
      setLabel(def)
      try {
        localStorage.removeItem(`kanban-label-${status}`)
      } catch {}
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitLabel()
    if (e.key === 'Escape') {
      setLabel(getStoredLabel(status))
      setEditing(false)
    }
  }

  const Icon = meta.Icon

  return (
    <div className={`kanban-column${isOver ? ' drag-over' : ''}`}>
      <div className={`kanban-column-header ${meta.className}`}>
        <span className={`kanban-column-dot ${meta.className}`} />
        {editing ? (
          <input
            ref={inputRef}
            className="kanban-column-title-input"
            value={label}
            onChange={handleLabelChange}
            onBlur={commitLabel}
            onKeyDown={handleKeyDown}
            maxLength={30}
          />
        ) : (
          <span
            className={`kanban-column-title ${meta.className}`}
            onDoubleClick={handleDoubleClick}
            title="Clique duplo para renomear"
          >
            {label}
          </span>
        )}
        <span className="kanban-column-count">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="kanban-column-body">
        {tasks.length === 0 ? (
          <div className="kanban-column-empty">
            <Icon size={28} />
            <span>{meta.emptyText}</span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              users={users}
              clientMap={clientMap}
              showDept={showDept}
              onClick={onCardClick}
              onArchive={onArchiveTask}
            />
          ))
        )}
      </div>
    </div>
  )
}
