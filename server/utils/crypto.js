// Encriptação AES-256-GCM para guardar tokens sensíveis (ex.: GitHub OAuth)
// A chave é derivada do JWT_SECRET — basta proteger essa env var.
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const secret = process.env.JWT_SECRET || ''
  if (!secret) throw new Error('JWT_SECRET ausente — não dá pra encriptar tokens')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plain) {
  if (!plain) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Formato: [iv(12) | tag(16) | ciphertext] em base64
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(payload) {
  if (!payload) return ''
  try {
    const buf = Buffer.from(payload, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const dec = crypto.createDecipheriv(ALGO, getKey(), iv)
    dec.setAuthTag(tag)
    return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8')
  } catch {
    return ''
  }
}
