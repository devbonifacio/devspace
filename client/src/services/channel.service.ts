import api from './api'

export const channelService = {
  getByGroup: (groupId: string) =>
    api.get(`/api/channels/${groupId}`).then(r => r.data),
  create: (data: { name: string; groupId: string; type: string }) =>
    api.post('/api/channels', data).then(r => r.data),
}
