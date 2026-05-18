import api from './api'
import type { GroupPermissions } from '../types'

export const groupService = {
  getMyGroups: () => api.get('/api/groups').then(r => r.data),
  create: (data: { name: string; description: string }) =>
    api.post('/api/groups', data).then(r => r.data),
  join: (inviteCode: string) =>
    api.post('/api/groups/join', { inviteCode }).then(r => r.data),
  leave: (id: string) =>
    api.post(`/api/groups/${id}/leave`).then(r => r.data),
  getById: (id: string) => api.get(`/api/groups/${id}`).then(r => r.data),
  remove: (id: string) => api.delete(`/api/groups/${id}`).then(r => r.data),
  addAdmin: (groupId: string, userId: string) =>
    api.post(`/api/groups/${groupId}/admins`, { userId }).then(r => r.data),
  removeAdmin: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/admins/${userId}`).then(r => r.data),
  kick: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/members/${userId}`).then(r => r.data),
  updatePermissions: (groupId: string, patch: Partial<GroupPermissions>) =>
    api.patch(`/api/groups/${groupId}/permissions`, patch).then(r => r.data),
}
