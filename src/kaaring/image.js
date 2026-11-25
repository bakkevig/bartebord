// Gjør et bilde fra mobilkameraet om til et kvadratisk JPEG-bilde på rundt
// 100–200 kB, slik at opplastingen går raskt også på dårlig nett.
export async function toSquareJpeg(file, size = 900, quality = 0.82) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Klarte ikke å lese bildet. Prøv å ta et nytt.'))
      el.src = objectUrl
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const out = Math.min(size, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out,
    )
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Klarte ikke å behandle bildet. Prøv å ta et nytt.')
    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
