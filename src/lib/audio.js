// Microphone recording fallback for when live speech recognition is broken
// (installed-PWA Chrome bug, browsers without Web Speech): capture a short
// clip, let Gemini transcribe it.
//
// Clips are re-encoded to mono 16 kHz WAV before upload. Recorders produce
// audio/webm (Android Chrome) or audio/mp4 (iOS Safari), and Gemini's API
// does not reliably accept either; WAV is documented-supported everywhere
// and a 30 s mono 16 kHz clip is under 1 MB.

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
const MAX_RECORDING_MS = 30000
const MIN_BLOB_BYTES = 1000
const WAV_SAMPLE_RATE = 16000

export function isRecordingSupported() {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
}

function pickMimeType() {
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

function bufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

// Decode whatever the recorder produced and resample to mono 16 kHz WAV.
// Chrome decodes webm/opus natively, Safari decodes its own mp4/AAC.
async function toWav(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    const length = Math.ceil(decoded.duration * WAV_SAMPLE_RATE)
    if (length === 0) return null
    const offline = new OfflineAudioContext(1, length, WAV_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE)
  } finally {
    ctx.close().catch(() => {})
  }
}

// Starts recording immediately. stop() resolves with { base64, mimeType },
// or null when the clip is too short to contain speech. cancel() throws
// everything away. Recording self-caps at 30 seconds; onAutoStop fires so
// the caller can move on instead of showing a live mic that isn't.
export async function startRecording({ onAutoStop } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = () => reject(new Error('Recording failed. Try again or type it.'))
  })

  recorder.start()
  const timeout = setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop()
      if (onAutoStop) onAutoStop()
    }
  }, MAX_RECORDING_MS)

  function cleanup() {
    clearTimeout(timeout)
    stream.getTracks().forEach((t) => t.stop())
  }

  return {
    async stop() {
      if (recorder.state === 'recording') recorder.stop()
      try {
        await stopped
      } finally {
        cleanup()
      }
      const containerType = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunks, { type: containerType })
      if (blob.size < MIN_BLOB_BYTES) return null

      try {
        const wav = await toWav(blob)
        if (!wav) return null
        return { base64: bufferToBase64(wav), mimeType: 'audio/wav' }
      } catch {
        // Decode failed; send the raw container and let Gemini try.
        const raw = await blob.arrayBuffer()
        return { base64: bufferToBase64(raw), mimeType: containerType.split(';')[0] }
      }
    },
    cancel() {
      try {
        if (recorder.state === 'recording') recorder.stop()
      } catch {
        // Already stopped; nothing to do.
      }
      cleanup()
    },
  }
}
