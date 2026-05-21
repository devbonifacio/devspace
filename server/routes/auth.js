import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect, isOwnerEmail } from '../middleware/auth.js'
import { isBanned, banMessage } from '../utils/ban.js'
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

export default router
