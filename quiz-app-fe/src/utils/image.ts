// Turn a photo picked by the user into a small JPEG data URL (a phone photo can be
// 5 MB+; the API accepts at most ~2.5 MB of base64, and a document stays readable at ~1400 px).

const MAX_INPUT_BYTES = 15 * 1024 * 1024

export class ImageError extends Error {
  readonly reason: 'type' | 'size' | 'read'

  constructor(reason: 'type' | 'size' | 'read') {
    super(reason)
    this.name = 'ImageError'
    this.reason = reason
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageError('read'))
    img.src = url
  })
}

export async function fileToResizedDataUrl(file: File, maxSide = 1400, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageError('type')
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('size')

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageError('read')
    ctx.fillStyle = '#ffffff' // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
