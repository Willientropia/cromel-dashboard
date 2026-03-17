import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import { IconUser, IconCamera, IconCheck } from '../../components/Icons/Icons'

function getInitials(username) {
  if (!username) return '?'
  return username
    .split(/[._-]/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handlePhotoClick() {
    fileRef.current?.click()
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no maximo 2MB.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result
      setLoading(true)
      try {
        const res = await api.updateProfile({ photo: base64 })
        if (res.success) {
          setUser((prev) => ({ ...prev, photo: base64 }))
          showToast('Foto atualizada!')
        } else {
          showToast(res.error || 'Erro ao atualizar foto.', 'error')
        }
      } catch {
        showToast('Erro ao atualizar foto.', 'error')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (!password || password.length < 4) {
      showToast('A senha deve ter no minimo 4 caracteres.', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('As senhas nao coincidem.', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await api.updateProfile({ password })
      if (res.success) {
        setPassword('')
        setConfirmPassword('')
        showToast('Senha alterada com sucesso!')
      } else {
        showToast(res.error || 'Erro ao alterar senha.', 'error')
      }
    } catch {
      showToast('Erro ao alterar senha.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1><IconUser size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />Meu Perfil</h1>
      </div>

      <div className="page-content">
        <div className="profile-container">
          {/* Photo section */}
          <div className="profile-card">
            <div className="profile-photo-section">
              <div className="profile-photo-wrapper" onClick={handlePhotoClick}>
                {user?.photo ? (
                  <img src={user.photo} alt="Foto" className="profile-photo-img" />
                ) : (
                  <div className="profile-photo-placeholder">
                    {getInitials(user?.username)}
                  </div>
                )}
                <div className="profile-photo-overlay">
                  <IconCamera size={20} />
                  <span>Alterar foto</span>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <h3 className="profile-username">{user?.username}</h3>
              <span className="profile-role">
                {user?.role === 'admin' ? 'Administrador' : user?.departments?.join(', ') || 'Usuario'}
              </span>
            </div>

            <div className="profile-info">
              <div className="profile-info-row">
                <span className="profile-info-label">Usuario</span>
                <span className="profile-info-value">{user?.username}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Funcao</span>
                <span className="profile-info-value">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
              </div>
              {user?.departments?.length > 0 && (
                <div className="profile-info-row">
                  <span className="profile-info-label">Departamento{user.departments.length > 1 ? 's' : ''}</span>
                  <span className="profile-info-value">{user.departments.join(', ')}</span>
                </div>
              )}
              <div className="profile-info-row">
                <span className="profile-info-label">Conta criada</span>
                <span className="profile-info-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                    : '---'}
                </span>
              </div>
            </div>
          </div>

          {/* Password change */}
          <div className="profile-card">
            <h3 className="profile-card-title">Alterar Senha</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Nova senha</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 4 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar nova senha</label>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !password}
              >
                <IconCheck size={14} />
                {loading ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '\u2713' : '\u2717'}</span>
          {toast.msg}
        </div>
      )}
    </>
  )
}
