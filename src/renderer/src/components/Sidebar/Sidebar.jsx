import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoUrl from '../../assets/logo.svg'

const DEPT_COLORS = {
  Financeiro: '#2E7D32',
  Engenharia: '#1565C0',
  Laboratorio: '#6A1B9A'
}

const DEPT_ICONS = {
  Financeiro: '💰',
  Engenharia: '⚙️',
  Laboratorio: '🔬'
}

function getInitials(username) {
  if (!username) return '?'
  return username
    .split(/[._-]/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const dept = user?.department

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logoUrl} alt="Cromel" />
        <span className="sidebar-logo-text">Cromel Dashboard</span>
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard section */}
        <div className="sidebar-section-label">Dashboard</div>

        {isAdmin ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">🏠</span>
              <span className="sidebar-link-text">Visão Geral</span>
            </NavLink>

            <NavLink to="/admin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">⚡</span>
              <span className="sidebar-link-text">Painel Admin</span>
            </NavLink>
          </>
        ) : (
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">
              {dept ? DEPT_ICONS[dept] || '📋' : '📋'}
            </span>
            <span className="sidebar-link-text">{dept || 'Meu Dashboard'}</span>
            {dept && (
              <span
                className="sidebar-dept-dot"
                style={{ background: DEPT_COLORS[dept] || 'var(--primary)' }}
              />
            )}
          </NavLink>
        )}

        {/* Admin sections */}
        {isAdmin && (
          <>
            <div className="sidebar-section-label">Departamentos</div>
            {['Financeiro', 'Engenharia', 'Laboratorio'].map((d) => (
              <NavLink
                key={d}
                to={`/admin?dept=${d}`}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-link-icon">{DEPT_ICONS[d]}</span>
                <span className="sidebar-link-text">{d}</span>
                <span
                  className="sidebar-dept-dot"
                  style={{ background: DEPT_COLORS[d] }}
                />
              </NavLink>
            ))}

            <div className="sidebar-section-label">Administração</div>
            <NavLink to="/admin?tab=users" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">👥</span>
              <span className="sidebar-link-text">Usuários</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer: user info + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">{getInitials(user?.username)}</div>
          <div className="sidebar-user-details">
            <div className="sidebar-username">{user?.username}</div>
            <div className="sidebar-role">
              {isAdmin ? 'Administrador' : dept || 'Usuário'}
            </div>
          </div>
        </div>

        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <span>🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
