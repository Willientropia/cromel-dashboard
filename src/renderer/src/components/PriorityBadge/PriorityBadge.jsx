const LABELS = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta'
}

export default function PriorityBadge({ priority }) {
  return (
    <span className={`priority-badge ${priority}`}>
      <span className="priority-badge-dot" />
      {LABELS[priority] || priority}
    </span>
  )
}
