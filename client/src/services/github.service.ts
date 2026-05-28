import api from './api'

export interface MyRepo {
  name: string
  url: string
  description: string
  language: string
  stars: number
  forks: number
  private: boolean
}

export const githubService = {
  // Devolve a URL pra qual o navegador deve ir pra começar o OAuth
  start: (): Promise<{ url: string }> =>
    api.get('/api/github/start').then(r => r.data),

  // Lista os repos do usuário (inclui privados que ele tem acesso)
  myRepos: (q = ''): Promise<MyRepo[]> =>
    api.get('/api/github/my-repos', { params: { q } }).then(r => r.data),

  disconnect: (): Promise<void> =>
    api.post('/api/github/disconnect').then(r => r.data),
}
