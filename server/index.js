import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'
import repoRoutes from './routes/repos.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/uploads.js'
import bookmarkRoutes from './routes/bookmarks.js'
import adminRoutes from './routes/admin.js'
import { setupSocket } from './socket/index.js'

dotenv.config()

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error(`❌ Variáveis de ambiente faltando: ${missing.join(', ')}`)
  process.exit(1)
}

const app = express()
const httpServer = createServer(app)

// Lista branca: CLIENT_URL (CSV em prod) + qualquer localhost em dev
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const corsOrigin = (origin, cb) => {
  if (!origin) return cb(null, true)
  if (allowedOrigins.includes(origin)) return cb(null, true)
  if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
  cb(new Error(`Origin não permitida: ${origin}`))
}

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, credentials: true }
})
app.set('io', io)

// Confia em 1 proxy à frente (Render/Vercel/etc) — necessário pro rate-limit pegar IP real
app.set('trust proxy', 1)

app.use(helmet({
  // CSP desabilitada aqui pq o front é servido por outro domínio (Vercel)
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// Rate-limits — chave por IP + endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,            // 15 min
  max: 10,                              // 10 tentativas por IP/janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,             // 1 min
  max: 120,                             // 120 req/min por IP (tranquilo pra uso normal)
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', apiLimiter)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  })
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/repos', repoRoutes)
app.use('/api/users', userRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/bookmarks', bookmarkRoutes)
app.use('/api/admin', adminRoutes)

// 404 das rotas /api/*
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado' }))

// Handler global — última linha de defesa pra não derrubar o processo
app.use((err, _req, res, _next) => {
  console.error('❌ Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

setupSocket(io)

const PORT = process.env.PORT || 3001

const connectWithRetry = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    console.log('✅ MongoDB conectado')
    httpServer.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`))
  } catch (err) {
    const delay = Math.min(30000, attempt * 2000)
    console.error(`❌ Falha ao conectar Mongo (tentativa ${attempt}): ${err.message}. Retry em ${delay}ms`)
    setTimeout(() => connectWithRetry(attempt + 1), delay)
  }
}

mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB desconectado'))
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconectado'))

process.on('unhandledRejection', err => console.error('unhandledRejection:', err))
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, fechando servidor...')
  httpServer.close(() => mongoose.connection.close().then(() => process.exit(0)))
})

connectWithRetry()
