// Voice input, layered so it never dead-ends:
// 1. SpeechRecognition — free, live transcription while you talk.
// 2. If the speech service refuses even though the mic is granted (a known
//    Chrome bug in installed PWAs), the caller records a clip and has Gemini
//    transcribe it instead.
// 3. If the mic itself is blocked, the caller points at the keyboard's mic
//    key, which needs no site permission at all. Never settings instructions.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Request the mic explicitly: SpeechRecognition.start() alone doesn't
// reliably show the native permission prompt on Android Chrome, getUserMedia
// does. Only the grant matters; the stream is stopped immediately.
export async function requestMicAccess() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((t) => t.stop())
}

// Error kinds the caller can act on:
// 'no-speech' — user said nothing; benign, just say so.
// 'service-broken' — the mic was already granted (getUserMedia succeeded
//   before this ran) yet recognition refused or lost its network path; the
//   recorder fallback will work.
// 'other' — anything else; plain message, no drama.
function classify(error) {
  if (error === 'no-speech') return 'no-speech'
  if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'network') return 'service-broken'
  return 'other'
}

// onInterim/onFinal receive the transcript while speaking / when done.
// onError receives a kind from classify(). onEnd always fires last.
export function startListening({ onInterim, onFinal, onError, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new Ctor()
  recognition.lang = navigator.language || 'en-US'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    let transcript = ''
    let isFinal = false
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
      if (event.results[i].isFinal) isFinal = true
    }
    if (isFinal) onFinal(transcript.trim())
    else onInterim(transcript.trim())
  }

  recognition.onerror = (event) => onError(classify(event.error))
  recognition.onend = () => onEnd()

  recognition.start()
  return recognition
}
