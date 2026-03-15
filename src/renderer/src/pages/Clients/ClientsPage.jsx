import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ClientModal from '../../components/ClientModal/ClientModal'
import ClientDetailModal from '../../components/ClientDetailModal/ClientDetailModal'
import { IconUsers, IconPlus, IconRefresh, IconEdit } from '../../components/Icons/Icons'
import { canManageClients } from '../../lib/permissions'

export default function ClientsPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [toast, setToast] = useState(null)

  const canManage = canManageClients(user)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [clientsRes, tasksRes] = await Promise.all([
        window.api.listClients(),
        window.api.listTasks({})
      ])
      if (clientsRes.success) setClients(clientsRes.data)
      if (tasksRes.success) setTasks(tasksRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function isClientActive(clientId) {
    return tasks.some((t) => t.clientId === clientId && !t.archived && t.status !== 'concluido')
  }

  const filtered = search
    ? clients.filter((c) => {
        const q = search.toLowerCase()
        return (
          c.nome.toLowerCase().includes(q) ||
          c.dadosObra?.toLowerCase().includes(q) ||
          c.orc?.toLowerCase().includes(q) ||
          c.tipoObra?.toLowerCase().includes(q)
        )
      })
    : clients

  const sorted = [...filtered].sort((a, b) => {
    const aActive = isClientActive(a.id)
    const bActive = isClientActive(b.id)
    if (aActive !== bActive) return aActive ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  function handleClientSaved(saved) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    showToast('Cliente salvo!')
  }

  return (
    <>
      <div className="page-header">
        <h1>
          <IconUsers size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Clientes
        </h1>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <IconRefresh size={14} /> Atualizar
        </button>
      </div>

      <div className="page-content">
        <div className="kanban-toolbar" style={{ marginBottom: 16 }}>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowNewClient(true)}>
              <IconPlus size={14} /> Novo Cliente
            </button>
          )}
          <input
            className="form-input"
            placeholder="Buscar por nome, obra, ORC ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 'auto', minWidth: 250 }}
          />
          <span className="text-sm text-muted">
            {sorted.length} cliente{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            Carregando clientes...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <div className="user-table-section">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Dados da Obra</th>
                  <th>ORC / OV / OSS</th>
                  <th>Tipo de Obra</th>
                  <th>Tarefas Ativas</th>
                  <th>Status</th>
                  {canManage && <th>Acoes</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const active = isClientActive(c.id)
                  const activeTasks = tasks.filter(
                    (t) => t.clientId === c.id && !t.archived && t.status !== 'concluido'
                  )
                  return (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer', opacity: active ? 1 : 0.55 }}
                      onClick={() => setSelectedClient(c)}
                    >
                      <td><span className="font-bold">{c.nome}</span></td>
                      <td className="text-sm">{c.dadosObra || '\u2014'}</td>
                      <td className="text-sm">{c.orc || '\u2014'}</td>
                      <td className="text-sm">{c.tipoObra || '\u2014'}</td>
                      <td>
                        <span className="text-sm">
                          {activeTasks.length > 0
                            ? `${activeTasks.length} tarefa${activeTasks.length !== 1 ? 's' : ''}`
                            : '\u2014'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: active ? 'var(--col-progress-header)20' : 'var(--gray-200)',
                            color: active ? 'var(--col-progress-header)' : 'var(--text-muted)'
                          }}
                        >
                          {active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManage && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="table-actions">
                            <button
                              className="btn-icon"
                              onClick={() => setEditingClient(c)}
                              title="Editar cliente"
                            >
                              <IconEdit size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewClient && (
        <ClientModal
          onClose={() => setShowNewClient(false)}
          onSaved={(s) => { handleClientSaved(s); setShowNewClient(false) }}
        />
      )}

      {editingClient && (
        <ClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={(s) => { handleClientSaved(s); setEditingClient(null) }}
          onDeleted={(id) => { setClients((prev) => prev.filter((c) => c.id !== id)); setEditingClient(null); showToast('Cliente excluido.') }}
        />
      )}

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => { setSelectedClient(null); loadData() }}
          onClientUpdated={loadData}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '\u2713' : '\u2717'}</span>
          {toast.msg}
        </div>
      )}
    </>
  )
}
