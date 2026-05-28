import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'
import { encrypt, decrypt } from '../utils/crypto.js'

const router = express.Router()

const isConfigured = () =>
  !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)

// URL pública do backend (Render). Auto-detecta pelo header se vazio.
const getServerBaseUrl = (req) =>
  (process.env.API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')

// Primeira URL do CSV de CLIENT_URL — frontend onde redirecionar de volta.
const getClientBaseUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim()

// GET /api/github/start — devolve a URL pro qual o cliente deve navegar.
// State é um JWT curto que amarra o callback ao usuário que iniciou.
router.get('/start', protect, (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'GitHub OAuth não configurado no servidor' })
  }
  const state = jwt.sign(
    { uid: String(req.user._id) },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  )
  const redirect_uri = `${getServerBaseUrl(req)}/api/github/callback`
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri,
    scope: 'read:user user:email repo',
    state,
    allow_signup: 'false',
  })
  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` })
})

// GET /api/github/callback — GitHub redireciona pra cá após autorização
router.get('/callback', async (req, res) => {
  const client = getClientBaseUrl()
  const fail = (reason) =>
    res.redirect(`${client}/app?github=error&reason=${encodeURIComponent(reason)}`)

  try {
    if (!isConfigured()) return fail('OAuth não configurado')

    const { code, state } = req.query
    if (!code || !state) return fail('Faltam parâmetros')

    let decoded
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET)
    } catch {
      return fail('State inválido ou expirado')
    }

    const user = await User.findById(decoded.uid)
    if (!user) return fail('Usuário não encontrado')

    // Troca o code por um access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: String(code),
      }),
    })
    if (!tokenRes.ok) return fail('Falha ao obter token do GitHub')
    const tokenJson = await tokenRes.json()
    const accessToken = tokenJson.access_token
    if (!accessToken) return fail(tokenJson.error_description || tokenJson.error || 'Token vazio')

    // Pega perfil pra extrair username/avatar
    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    })
    if (!profileRes.ok) return fail('Falha ao buscar perfil do GitHub')
    const profile = await profileRes.json()

    user.github = {
      id: String(profile.id),
      username: profile.login || '',
      avatar: profile.avatar_url || '',
      token: encrypt(accessToken),
      connectedAt: new Date(),
    }
    // Preenche o githubUrl visível se ainda estiver vazio
    if (!user.githubUrl && profile.html_url) {
      user.githubUrl = profile.html_url
    }
    await user.save()

    res.redirect(`${client}/app?github=connected`)
  } catch (err) {
    fail(err.message || 'Erro inesperado')
  }
})

// GET /api/github/my-repos?q= — lista repos do usuário (inclui privados)
router.get('/my-repos', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const enc = user?.github?.token
    if (!enc) return res.status(400).json({ error: 'GitHub não conectado' })

    const token = decrypt(enc)
    if (!token) return res.status(400).json({ error: 'Token inválido — reconecte o GitHub' })

    const r = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member',
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    )
    if (!r.ok) return res.status(r.status).json({ error: 'GitHub recusou o token' })
    const repos = await r.json()

    const q = (req.query.q || '').toString().trim().toLowerCase()
    const mapped = repos.map(d => ({
      name: d.full_name,
      url: d.html_url,
      description: d.description || '',
      language: d.language || '',
      stars: d.stargazers_count,
      forks: d.forks_count,
      private: !!d.private,
    }))
    const filtered = q
      ? mapped.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q))
      : mapped
    res.json(filtered)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/github/disconnect — desconecta a conta GitHub
router.post('/disconnect', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    user.github = { id: null, username: '', avatar: '', token: '', connectedAt: null }
    await user.save()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
