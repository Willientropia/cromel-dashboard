import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { IconWarning } from '../../components/Icons/Icons'
import logoUrl from '../../assets/logo.svg'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState('')
  const [updateVersion, setUpdateVersion] = useState(null)

  useEffect(() => {
    window.api?.getVersion?.().then((v) => setVersion(v)).catch(() => {})
    window.api?.onUpdateAvailable?.((v) => setUpdateVersion(v))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Erro ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {updateVersion && (
        <div className="login-update-banner">
          Nova versão {updateVersion} disponível — baixando automaticamente...
        </div>
      )}
      <div className="login-card">
        <div className="login-logo">
          <img src={logoUrl} alt="Cromel Logo" />
          <div className="login-logo-name">Cromel Dashboard</div>
          <div className="login-logo-sub">Sistema de Gestao de Servicos</div>
        </div>

        <h1 className="login-title">Bem-vindo</h1>
        <p className="login-subtitle">Faca login para acessar seu painel</p>

        {error && (
          <div className="login-error">
            <IconWarning size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input
              className="form-input"
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="seu.usuario"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
      {version && (
        <div className="login-version">v{version}</div>
      )}
    </div>
  )
}
