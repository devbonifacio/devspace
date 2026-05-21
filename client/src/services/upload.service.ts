import api from './api'
import { assertImageSafe } from './moderation'

interface UploadResult {
  url: string
  width: number
  height: number
  bytes: number
  format: string
}

interface SignatureResp {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  tags: string
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const uploadService = {
  /**
   * Faz upload direto pro Cloudinary com assinatura curta vinda do server.
   * Toda imagem passa por moderação NSFW no navegador antes de subir.
   * @param folder 'avatars' | 'banners' | 'chat'
   */
  async upload(file: File, folder: 'avatars' | 'banners' | 'chat', onProgress?: (pct: number) => void): Promise<UploadResult> {
    if (!ALLOWED.includes(file.type)) {
      throw new Error('Tipo de imagem inválido (jpg, png, gif, webp)')
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Imagem muito grande (máx 5 MB)')
    }

    // Moderação: bloqueia conteúdo impróprio antes de qualquer upload
    await assertImageSafe(file)

    const sig: SignatureResp = await api.get(`/api/uploads/signature?folder=${folder}`).then(r => r.data)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', String(sig.timestamp))
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)
    fd.append('tags', sig.tags)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve({
            url: data.secure_url,
            width: data.width,
            height: data.height,
            bytes: data.bytes,
            format: data.format,
          })
        } else {
          let msg = 'Erro no upload'
          try { msg = JSON.parse(xhr.responseText)?.error?.message || msg } catch {}
          reject(new Error(msg))
        }
      }
      xhr.onerror = () => reject(new Error('Erro de rede no upload'))
      xhr.send(fd)
    })
  },
}
