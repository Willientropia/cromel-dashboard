import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'

export default function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  )
}
