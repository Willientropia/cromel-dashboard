import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import PriorityBadge from '../PriorityBadge/PriorityBadge'

const STATUSES = ['pendente', 'em-andamento', 'concluido']

export default function KanbanBoard({
  tasks,
  users = [],
  showDept = false,
  onTaskMove,
  onCardClick
}) {
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event) {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    setActiveTask(task || null)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return
    const newStatus = over.id // column id = status string
    if (!STATUSES.includes(newStatus)) return

    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return

    onTaskMove && onTaskMove(task.id, newStatus)
  }

  function handleDragCancel() {
    setActiveTask(null)
  }

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kanban-board">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            users={users}
            showDept={showDept}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag overlay: floating card while dragging */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask && (
          <div className="kanban-card dragging" style={{ maxWidth: 320 }}>
            <div className="kanban-card-header">
              <span className="kanban-card-title">{activeTask.title}</span>
            </div>
            {activeTask.description && (
              <p className="kanban-card-description">{activeTask.description}</p>
            )}
            <div className="kanban-card-footer">
              <PriorityBadge priority={activeTask.priority} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
