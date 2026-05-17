import api from './api'
import type { User } from '../types'

export const authService = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),
  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }).then(r => r.data),
  me: (): Promise<{ user: User }> =>
    api.get('/api/auth/me').then(r => r.data),
}
