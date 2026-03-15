import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import ClientModal from '../../components/ClientModal/ClientModal'
import { IconUsers, IconPlus, IconRefresh } from '../../components/Icons/Icons'
import { canManageClients } from '../../lib/permissions'

export default function ClientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
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

  const filteredClients = search
    ? clients.filter((c) => {
        const q = search.toLowerCase()
        return (
          c.nome.toLowerCase().includes(q) ||
          c.cidade?.toLowerCase().includes(q) ||
          c.empresa?.toLowerCase().includes(q)
        )
      })
    : clients

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
            placeholder="Buscar por nome, cidade ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 'auto', minWidth: 250 }}
          />
          <span className="text-sm text-muted">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            Carregando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <div className="client-grid">
            {filteredClients.map((c) => {
              const clientTasks = tasks.filter((t) => t.clientId === c.id)
              return (
                <div
                  key={c.id}
                  className="client-card"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <div className="client-card-name">{c.nome}</div>
                  <div className="client-card-info">
                    {[c.cidade, c.empresa].filter(Boolean).join(' \u2022 ') || '\u2014'}
                  </div>
                  {clientTasks.length > 0 && (
                    <span className="client-card-tasks">
                      {clientTasks.length} tarefa{clientTasks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewClient && (
        <ClientModal
          onClose={() => setShowNewClient(false)}
          onSaved={(s) => {
            handleClientSaved(s)
            setShowNewClient(false)
          }}
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
