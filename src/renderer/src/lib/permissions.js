import { CLIENT_MANAGER_DEPTS } from './constants'

export function canManageClients(user) {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.departments?.some((d) => CLIENT_MANAGER_DEPTS.includes(d)) || false
}
