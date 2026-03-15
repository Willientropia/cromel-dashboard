import { DeptIcon } from '../Icons/Icons'
import { DEPARTMENTS, DEPT_COLORS } from '../../lib/constants'

const STATUS_LABEL = { pendente: 'Pendente', 'em-andamento': 'Em Andamento', concluido: 'Concluido' }
const STATUS_COLOR = { pendente: 'var(--col-pending-header)', 'em-andamento': 'var(--col-progress-header)', concluido: 'var(--col-done-header)' }

function avgDays(tasks) {
  const done = tasks.filter((t) => t.completedAt && t.createdAt)
  if (!done.length) return null
  const total = done.reduce((sum, t) => {
    const ms = new Date(t.completedAt) - new Date(t.createdAt)
    return sum + ms / (1000 * 60 * 60 * 24)
  }, 0)
  return (total / done.length).toFixed(1)
}

export default function AdminOverview({ tasks, users, clients }) {
  const now = new Date()
  const activeTasks = tasks.filter((t) => !t.archived)
  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'concluido'
  )
  const teamMembers = users.filter((u) => u.role !== 'admin')
  const clientMap = {}
  clients.forEach((c) => { clientMap[c.id] = c })

  const recentTasks = [...activeTasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)

  const deptStats = DEPARTMENTS.map((dept) => {
    const dt = activeTasks.filter((t) => t.department === dept)
    const allDt = tasks.filter((t) => t.department === dept)
    return {
      dept,
      pendente: dt.filter((t) => t.status === 'pendente').length,
      emAndamento: dt.filter((t) => t.status === 'em-andamento').length,
      concluido: dt.filter((t) => t.status === 'concluido').length,
      atrasadas: dt.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'concluido').length,
      avg: avgDays(allDt)
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <SummaryCard label="Tarefas Ativas" value={activeTasks.length} color="var(--primary)" />
        <SummaryCard
          label="Tarefas Atrasadas"
          value={overdueTasks.length}
          color={overdueTasks.length > 0 ? 'var(--col-done-header)' : 'var(--success)'}
        />
        <SummaryCard label="Clientes" value={clients.length} color="var(--col-progress-header)" />
        <SummaryCard label="Membros da Equipe" value={teamMembers.length} color="#6A1B9A" />
      </div>

      {/* Dept table */}
      <div className="user-table-section">
        <div className="user-table-header">
          <h3>Por Departamento</h3>
        </div>
        <table className="user-table">
          <thead>
            <tr>
              <th>Departamento</th>
              <th style={{ textAlign: 'center' }}>Pendente</th>
              <th style={{ textAlign: 'center' }}>Em Andamento</th>
              <th style={{ textAlign: 'center' }}>Concluido</th>
              <th style={{ textAlign: 'center' }}>Atrasadas</th>
              <th style={{ textAlign: 'center' }}>Tempo medio (dias)</th>
            </tr>
          </thead>
          <tbody>
            {deptStats.map(({ dept, pendente, emAndamento, concluido, atrasadas, avg }) => (
              <tr key={dept}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: DEPT_COLORS[dept] }}>
                      <DeptIcon department={dept} size={15} />
                    </span>
                    <span className="font-bold">{dept}</span>
                    <span className="sidebar-dept-dot" style={{ background: DEPT_COLORS[dept] }} />
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <CountBadge value={pendente} color="var(--col-pending-header)" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <CountBadge value={emAndamento} color="var(--col-progress-header)" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <CountBadge value={concluido} color="var(--col-done-header)" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <CountBadge value={atrasadas} color={atrasadas > 0 ? '#E53935' : 'var(--gray-400)'} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="text-sm text-muted">{avg !== null ? `${avg}d` : '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent tasks */}
      <div className="user-table-section">
        <div className="user-table-header">
          <h3>Atividade Recente</h3>
          <span className="text-sm text-muted">Ultimas tarefas atualizadas</span>
        </div>
        {recentTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
            Nenhuma tarefa encontrada.
          </div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Departamento</th>
                <th>Status</th>
                <th>Cliente</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((t) => (
                <tr key={t.id}>
                  <td><span className="font-bold">{t.title}</span></td>
                  <td>
                    <span
                      className="dept-badge"
                      style={{ background: `${DEPT_COLORS[t.department]}15`, color: DEPT_COLORS[t.department] }}
                    >
                      <DeptIcon department={t.department} size={12} /> {t.department}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[t.status] }}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {clientMap[t.clientId]?.nome || '—'}
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(t.updatedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function CountBadge({ value, color }) {
  if (value === 0) return <span className="text-sm text-muted">—</span>
  return (
    <span style={{
      display: 'inline-block',
      minWidth: 24,
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 700,
      background: `${color}20`,
      color
    }}>
      {value}
    </span>
  )
}
