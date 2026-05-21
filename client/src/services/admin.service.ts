import api from './api'

export interface ModUser {
  _id: string
  username: string
  email: string
  avatar: string
  role: string
  status: 'online' | 'away' | 'offline'
  createdAt: string
  banned: boolean
  ban?: {
    until: string | null
    reason: string
    by: string
    at: string | null
  }
}

export interface ModStats {
  total: number
  online: number
  banned: number
}

export interface BanOptions {
  minutes?: number
  permanent?: boolean
  reason: string
}

export const adminService = {
  async getUsers(q = ''): Promise<{ users: ModUser[]; stats: ModStats }> {
    const r = await api.get('/api/admin/users', { params: { q } })
    return r.data
  },

  async ban(userId: string, opts: BanOptions): Promise<void> {
    await api.post(`/api/admin/users/${userId}/ban`, opts)
  },

  async unban(userId: string): Promise<void> {
    await api.post(`/api/admin/users/${userId}/unban`)
  },
}
