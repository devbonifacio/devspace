import api from './api'
import type { Message } from '../types'

export interface Bookmark {
  _id: string
  user: string
  message: Message
  note: string
  createdAt: string
}

export const bookmarkService = {
  list: (): Promise<Bookmark[]> =>
    api.get('/api/bookmarks').then(r => r.data),
  check: (messageId: string): Promise<{ bookmarked: boolean }> =>
    api.get(`/api/bookmarks/check/${messageId}`).then(r => r.data),
  toggle: (messageId: string, note?: string): Promise<{ bookmarked: boolean }> =>
    api.post(`/api/bookmarks/${messageId}`, note ? { note } : {}).then(r => r.data),
  remove: (messageId: string) =>
    api.delete(`/api/bookmarks/${messageId}`).then(r => r.data),
}
