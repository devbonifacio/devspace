import api from './api'
import type { User } from '../types'

export const userService = {
  search: (q: string): Promise<User[]> =>
    api.get(`/api/users/search?q=${encodeURIComponent(q)}`).then(r => r.data),
  getById: (id: string): Promise<User> =>
    api.get(`/api/users/${id}`).then(r => r.data),
  online: (): Promise<User[]> =>
    api.get('/api/users/online').then(r => r.data),
  getBot: (): Promise<User> =>
    api.get('/api/users/bot').then(r => r.data),
  suggestions: (): Promise<User[]> =>
    api.get('/api/users/suggestions').then(r => r.data),
  updateProfile: (data: { bio?: string; githubUrl?: string; avatar?: string }): Promise<User> =>
    api.patch('/api/users/profile', data).then(r => r.data),
  setStatus: (status: 'online' | 'away' | 'offline') =>
    api.patch('/api/users/status', { status }).then(r => r.data),
  setCustomStatus: (emoji: string, text: string): Promise<User> =>
    api.patch('/api/users/custom-status', { emoji, text }).then(r => r.data),
}
