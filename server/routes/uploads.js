import express from 'express'
import { v2 as cloudinary } from 'cloudinary'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

// GET /api/uploads/signature?folder=avatars|chat
// Retorna params + signature pra client fazer upload direto pro Cloudinary
router.get('/signature', protect, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Upload não configurado no servidor' })
    }

    const folder = req.query.folder === 'avatars' ? 'devspace/avatars' : 'devspace/chat'
    const timestamp = Math.round(Date.now() / 1000)

    // Tags pro Cloudinary (útil pra auditoria/cleanup futuro)
    const tags = `user_${req.user._id},${folder.split('/').pop()}`

    const paramsToSign = { timestamp, folder, tags }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    )

    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder,
      tags,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
