import express from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { protect, isOwnerEmail } from '../middleware/auth.js'
import { isBanned, banMessage } from '../utils/ban.js'
import { sendResetEmail } from '../utils/email.js'
import { validatePassword, validateUsername, validateEmail } from '../utils/validation.js'

const router = express.Router()

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const sanitize = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  bio: user.bio,
  githubUrl: user.githubUrl,
  banner: user.banner,
  status: user.status,
  customStatus: user.customStatus,
  groups: user.groups,
  isOwner: isOwnerEmail(user.email),
})

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const usernameErr = validateUsername(username)
    if (usernameErr) return res.status(400).json({ error: usernameErr })

    const emailErr = validateEmail(email)
    if (emailErr) return res.status(400).json({ error: emailErr })

    const passwordErr = validatePassword(password)
    if (passwordErr) return res.status(400).json({ error: passwordErr })

    const user = await User.create({ username: username.trim(), email: email.toLowerCase().trim(), password })
    // A DM de boas-vindas do bot é enviada ao vivo na 1ª conexão (ver socket)
    res.json({ token: signToken(user._id), user: sanitize(user) })
  } catch (err) {
    // Erro de duplicate key do Mongo (username/email já em uso)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'campo'
      return res.status(400).json({ error: `${field} já está em uso` })
    }
    res.status(400).json({ error: err.message })
  }
})

// GET /api/auth/me — recupera o user pelo token (rehydrate no boot do client)
router.get('/me', protect, async (req, res) => {
  res.json({ user: sanitize(req.user) })
})

// Hash dummy — usado pra rodar bcrypt mesmo se email não existe (mitiga timing attack)
import bcrypt from 'bcryptjs'
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', 10)

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Sempre roda compare — se user não existe, compara com dummy pra gastar o mesmo tempo
    const ok = user
      ? await user.comparePassword(password)
      : (await bcrypt.compare(password, DUMMY_HASH), false)

    if (!user || !ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    // Conta banida não loga
    if (isBanned(user)) {
      return res.status(403).json({ error: banMessage(user.ban), code: 'BANNED' })
    }
    res.json({ token: signToken(user._id), user: sanitize(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/forgot-password — envia email com link de redefinição
router.post('/forgot-password', async (req, res) => {
  // Resposta genérica — nunca revela se o email existe ou não
  const generic = { message: 'Se existir uma conta com esse email, enviamos um link de redefinição.' }
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') return res.json(generic)

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (user && user.role !== 'bot') {
      // Token cru vai no link; só o HASH é guardado no banco
      const raw = crypto.randomBytes(32).toString('hex')
      user.resetToken = crypto.createHash('sha256').update(raw).digest('hex')
      user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1h
      await user.save()

      const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim()
      const link = `${base}/reset-password?token=${raw}`
      try {
        await sendResetEmail(user.email, user.username, link)
      } catch (e) {
        console.error('email reset:', e.message)
      }
    }
    res.json(generic)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/reset-password — define nova senha a partir do token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios' })

    const passwordErr = validatePassword(password)
    if (passwordErr) return res.status(400).json({ error: passwordErr })

    const hash = crypto.createHash('sha256').update(String(token)).digest('hex')
    const user = await User.findOne({
      resetToken: hash,
      resetTokenExpiry: { $gt: new Date() },
    })
    if (!user) {
      return res.status(400).json({ error: 'Link inválido ou expirado. Pede um novo.' })
    }

    user.password = password // o pre-save hook faz o hash
    user.resetToken = null
    user.resetTokenExpiry = null
    await user.save()

    res.json({ message: 'Senha redefinida com sucesso. Já podes entrar.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
