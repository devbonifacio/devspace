/**
 * Moderação de imagens — roda 100% no navegador com nsfwjs (TensorFlow.js).
 * Classifica a imagem ANTES de subir pro Cloudinary. Se detectar conteúdo
 * impróprio (pornografia/hentai/conteúdo sexual explícito), bloqueia o upload.
 *
 * O nsfwjs + tfjs são carregados via CDN sob demanda (no 1º upload), então
 * NÃO entram no bundle da aplicação — peso zero no carregamento inicial.
 *
 * Estratégia "fail-open": se o modelo não carregar (rede/CDN fora), o upload
 * NÃO é bloqueado — não travamos uploads legítimos por falha técnica.
 * O bloqueio só acontece quando o modelo realmente classifica como impróprio.
 */

const TFJS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
const NSFW_URL = 'https://cdn.jsdelivr.net/npm/nsfwjs@4.3.0/dist/browser/nsfwjs.min.js'

interface NsfwPrediction { className: string; probability: number }
interface NsfwModel { classify(img: HTMLImageElement): Promise<NsfwPrediction[]> }

declare global {
  interface Window {
    tf?: unknown
    nsfwjs?: { load(): Promise<NsfwModel> }
  }
}

/** Erro lançado quando a imagem é reprovada na moderação. */
export class UnsafeImageError extends Error {
  constructor() {
    super('Imagem bloqueada: conteúdo impróprio detectado. Envie outra imagem.')
    this.name = 'UnsafeImageError'
  }
}

// Injeta um <script> de CDN uma única vez
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`)
    if (existing) {
      if (existing.getAttribute('data-loaded') === '1') return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('script error')))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.src = src
    s.onload = () => { s.dataset.loaded = '1'; resolve() }
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.head.appendChild(s)
  })
}

let modelPromise: Promise<NsfwModel> | null = null

// Carrega tfjs + nsfwjs + modelo uma única vez (lazy)
function getModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(TFJS_URL)
      await loadScript(NSFW_URL)
      if (!window.nsfwjs) throw new Error('nsfwjs indisponível')
      return window.nsfwjs.load()
    })()
  }
  return modelPromise
}

// Decodifica o File num <img> pra classificar
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao decodificar imagem'))
    img.src = url
  })
}

/**
 * Verifica se a imagem é segura. Lança UnsafeImageError se for imprópria.
 * Resolve normalmente se for segura OU se a verificação falhar (fail-open).
 */
export async function assertImageSafe(file: File): Promise<void> {
  let model: NsfwModel
  try {
    model = await getModel()
  } catch {
    return // fail-open: modelo indisponível → não bloqueia
  }

  const url = URL.createObjectURL(file)
  let predictions: NsfwPrediction[]
  try {
    const img = await loadImage(url)
    predictions = await model.classify(img)
  } catch {
    return // fail-open: imagem não decodificável → não bloqueia
  } finally {
    URL.revokeObjectURL(url)
  }

  const p = Object.fromEntries(predictions.map(x => [x.className, x.probability]))
  const porn = p['Porn'] ?? 0
  const hentai = p['Hentai'] ?? 0
  const sexy = p['Sexy'] ?? 0

  // Pornografia/hentai: limiar baixo (bloqueia agressivo).
  // "Sexy" pega biquíni/sem camisa — limiar alto pra evitar falso positivo.
  if (porn > 0.5 || hentai > 0.5 || sexy > 0.85) {
    throw new UnsafeImageError()
  }
}
