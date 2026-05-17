import api from './api'
import type { Message } from '../types'

interface PageResp {
  messages: Message[]
  hasMore: boolean
}

export const messageService = {
  getByChannel: (channelId: string, before?: string): Promise<PageResp> => {
    const qs = before ? `?before=${before}` : ''
    return api.get(`/api/messages/${channelId}${qs}`).then(r => r.data)
  },
  getDms: (userId: string, before?: string): Promise<PageResp> => {
    const qs = before ? `?before=${before}` : ''
    return api.get(`/api/messages/dm/${userId}${qs}`).then(r => r.data)
  },
  edit: (id: string, content: string) =>
    api.patch(`/api/messages/${id}`, { content }).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/api/messages/${id}`).then(r => r.data),
  search: (groupId: string, q: string) =>
    api.get(`/api/messages/search/${groupId}?q=${encodeURIComponent(q)}`).then(r => r.data),
}
