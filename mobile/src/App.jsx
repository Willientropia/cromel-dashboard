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
