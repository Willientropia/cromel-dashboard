import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import logoUrl from '../../assets/logo.svg'
import {
  IconHome,
  IconBolt,
  IconUsers,
  IconUser,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconMenu,
  DeptIcon
} from '../Icons/Icons'

const DEPT_COLORS = {
  Financeiro: '#2E7D32',
  Engenharia: '#1565C0',
  Laboratorio: '#6A1B9A'
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
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const dept = user?.department

  // Manual active state for admin links based on search params
  const params = new URLSearchParams(location.search)
  const currentDept = params.get('dept')
  const currentTab = params.get('tab')
  const isAdminPath = location.pathname === '/admin'

  function isAdminOverviewActive() {
    return isAdminPath && !currentDept && !currentTab
  }

  function isDeptActive(d) {
    return isAdminPath && currentDept === d
  }

  function isUsersActive() {
    return isAdminPath && currentTab === 'users'
  }

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
    {/* Mobile hamburger */}
    <button
      className="mobile-menu-btn"
      onClick={() => setMobileOpen(true)}
      title="Abrir menu"
    >
      <IconMenu size={22} />
    </button>

    {/* Mobile overlay */}
    {mobileOpen && <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)} />}

    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
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
        {collapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard section */}
        <div className="sidebar-section-label">Dashboard</div>

        {isAdmin ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon"><IconHome size={18} /></span>
              <span className="sidebar-link-text">Visao Geral</span>
            </NavLink>

            <a
              href="#"
              className={`sidebar-link${isAdminOverviewActive() ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate('/admin') }}
            >
              <span className="sidebar-link-icon"><IconBolt size={18} /></span>
              <span className="sidebar-link-text">Painel Admin</span>
            </a>
          </>
        ) : (
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">
              <DeptIcon department={dept} size={18} />
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
              <a
                key={d}
                href="#"
                className={`sidebar-link${isDeptActive(d) ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate(`/admin?dept=${d}`) }}
              >
                <span className="sidebar-link-icon"><DeptIcon department={d} size={18} /></span>
                <span className="sidebar-link-text">{d}</span>
                <span
                  className="sidebar-dept-dot"
                  style={{ background: DEPT_COLORS[d] }}
                />
              </a>
            ))}

            <div className="sidebar-section-label">Administracao</div>
            <a
              href="#"
              className={`sidebar-link${isUsersActive() ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate('/admin?tab=users') }}
            >
              <span className="sidebar-link-icon"><IconUsers size={18} /></span>
              <span className="sidebar-link-text">Usuarios</span>
            </a>
          </>
        )}
        <div className="sidebar-section-label">Conta</div>
        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="sidebar-link-icon"><IconUser size={18} /></span>
          <span className="sidebar-link-text">Meu Perfil</span>
        </NavLink>
      </nav>

      {/* Footer: theme toggle + user info + logout */}
      <div className="sidebar-footer">
        <button
          className="sidebar-theme-btn"
          onClick={toggleTheme}
          title={dark ? 'Modo claro' : 'Modo noturno'}
        >
          {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
          <span>{dark ? 'Modo Claro' : 'Modo Noturno'}</span>
        </button>

        <div className="sidebar-user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Meu Perfil">
          {user?.photo ? (
            <img src={user.photo} alt="" className="sidebar-avatar-img" />
          ) : (
            <div className="sidebar-avatar">{getInitials(user?.username)}</div>
          )}
          <div className="sidebar-user-details">
            <div className="sidebar-username">{user?.username}</div>
            <div className="sidebar-role">
              {isAdmin ? 'Administrador' : dept || 'Usuario'}
            </div>
          </div>
        </div>

        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <span className="sidebar-logout-icon"><IconLogout size={16} /></span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
    </>
  )
}
