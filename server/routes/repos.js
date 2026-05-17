import express from 'express'
import axios from 'axios'
import Group from '../models/Group.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const hasGithubToken = () =>
  process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'seu_token_github_aqui'

const githubHeaders = () =>
  hasGithubToken() ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}

// GET /api/repos/preview?url=https://github.com/user/repo
router.get('/preview', protect, async (req, res) => {
  try {
    const { url } = req.query
    const match = url?.match(/github\.com\/([^/]+)\/([^/?#]+)/)
    if (!match) return res.status(400).json({ error: 'URL inválida' })

    const [, owner, repoRaw] = match
    const repo = repoRaw.replace(/\.git$/, '')

    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: githubHeaders(), timeout: 8000 }
    )

    res.json({
      name: data.full_name,
      url: data.html_url,
      description: data.description,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count
    })
  } catch (err) {
    const code = err.response?.status === 403 ? 403 : 404
    const msg = code === 403 ? 'Rate limit do GitHub atingido' : 'Repositório não encontrado ou privado'
    res.status(code).json({ error: msg })
  }
})

// GET /api/repos/group/:groupId — lista repos do grupo
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('repos.addedBy', 'username avatar')
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

    const isMember = group.members.some(m => m.equals(req.user._id))
    if (!isMember) return res.status(403).json({ error: 'Sem permissão' })

    res.json(group.repos)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/repos/group/:groupId — adiciona repo ao grupo
router.post('/group/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

    const isMember = group.members.some(m => m.equals(req.user._id))
    if (!isMember) return res.status(403).json({ error: 'Sem permissão' })

    const dup = group.repos.find(r => r.url === req.body.url)
    if (dup) return res.status(400).json({ error: 'Repositório já adicionado ao grupo' })

    group.repos.push({ ...req.body, addedBy: req.user._id })
    await group.save()
    const populated = await Group.findById(group._id).populate('repos.addedBy', 'username avatar')
    res.json(populated.repos)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/repos/group/:groupId/:repoId — remove repo (autor ou admin)
router.delete('/group/:groupId/:repoId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

    const repo = group.repos.id(req.params.repoId)
    if (!repo) return res.status(404).json({ error: 'Repositório não encontrado' })

    const isAdmin = group.owner?.equals(req.user._id) ||
                    (group.admins || []).some(a => a.equals(req.user._id))
    const isOwner = repo.addedBy?.equals(req.user._id)
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Sem permissão' })

    group.repos.pull(repo._id)
    await group.save()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
