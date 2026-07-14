// Client-side photo compression before the Gemini call. A 12MP phone photo is
// wasted tokens and latency; ~1024px JPEG is plenty for food recognition.

const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.8

export async function compressImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
}
