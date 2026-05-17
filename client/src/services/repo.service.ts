import api from './api'
import type { Repo } from '../types'

export const repoService = {
  preview: (url: string): Promise<Repo> =>
    api.get(`/api/repos/preview?url=${encodeURIComponent(url)}`).then(r => r.data),
  listByGroup: (groupId: string): Promise<Repo[]> =>
    api.get(`/api/repos/group/${groupId}`).then(r => r.data),
  addToGroup: (groupId: string, repo: Partial<Repo>): Promise<Repo[]> =>
    api.post(`/api/repos/group/${groupId}`, repo).then(r => r.data),
  removeFromGroup: (groupId: string, repoId: string) =>
    api.delete(`/api/repos/group/${groupId}/${repoId}`).then(r => r.data),
}
