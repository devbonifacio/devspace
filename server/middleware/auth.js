import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { isBanned, banMessage } from '../utils/ban.js'

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Token ausente' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' })

    // Usuário banido não acessa nada — devolve 403 com a mensagem
    if (isBanned(user)) {
      return res.status(403).json({ error: banMessage(user.ban), code: 'BANNED' })
    }

    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

// Verifica se um email é o dono do painel de moderação (definido em OWNER_EMAIL)
export const isOwnerEmail = (email) => {
  const owner = (process.env.OWNER_EMAIL || '').toLowerCase().trim()
  return !!owner && (email || '').toLowerCase().trim() === owner
}

// Middleware: só deixa passar o dono do painel de moderação
export const requireOwner = (req, res, next) => {
  if (!isOwnerEmail(req.user?.email)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' })
  }
  next()
}
