import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@shared/contexts/AuthContext'
import { ThemeProvider } from '@shared/contexts/ThemeContext'

// Páginas importadas do shared (desktop)
import Layout from '@shared/components/Layout/Layout'
import LoginPage from '@shared/pages/Login/LoginPage'
import DashboardPage from '@shared/pages/Dashboard/DashboardPage'
import AdminPanelPage from '@shared/pages/AdminPanel/AdminPanelPage'
import ProfilePage from '@shared/pages/Profile/ProfilePage'
import ClientsPage from '@shared/pages/Clients/ClientsPage'
import ClientDetailPage from '@shared/pages/Clients/ClientDetailPage'
import NotFoundPage from '@shared/pages/NotFound/NotFoundPage'

function DefaultRedirect() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  const firstDept = user?.departments?.[0]
  if (firstDept) return <Navigate to={`/dashboard?dept=${firstDept}`} replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Carregando...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <DefaultRedirect /> : <LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:clientId" element={<ClientDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  // Mede env(safe-area-inset-top) via DOM e seta como --safe-top.
  // O env() pode retornar 0 nos primeiros frames — retenta até ter valor real.
  useEffect(() => {
    let retries = 0
    function measureSafeTop() {
      const el = document.createElement('div')
      el.style.cssText = 'position:fixed;top:env(safe-area-inset-top);left:0;width:0;height:0;pointer-events:none;visibility:hidden'
      document.documentElement.appendChild(el)
      const px = parseFloat(getComputedStyle(el).top) || 0
      document.documentElement.removeChild(el)
      if (px > 0 || retries >= 20) {
        document.documentElement.style.setProperty('--safe-top', `${px}px`)
      } else {
        retries++
        setTimeout(measureSafeTop, 50)
      }
    }
    measureSafeTop()
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function onResize() {
      const kbHeight = window.innerHeight - vv.height - vv.offsetTop
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, kbHeight)}px`)
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  )
}
