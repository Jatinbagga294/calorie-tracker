// Voice-to-text for the quick-add box. Wraps the Web Speech API (Chrome/Edge/
// Safari all ship SpeechRecognition under one prefix or another); on browsers
// without it the mic button simply doesn't render, no dead affordance.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Exact menu path differs by platform; give the real steps instead of a
// generic "check your settings" that leaves the user hunting.
export function micPermissionInstructions() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'Open Settings, scroll to this browser (or this app if you installed it), turn on Microphone, then reload the page.'
  }
  return 'Tap the lock icon next to the address bar, open Permissions, set Microphone to Allow, then reload the page.'
}

// SpeechRecognition.start() doesn't reliably surface the native permission
// prompt on its own across Android Chrome versions. Requesting the mic via
// getUserMedia first forces the real OS/browser dialog to appear (the same
// trick the barcode scanner uses for camera); we only need the grant, not
// the stream, so it's stopped immediately.
export async function requestMicAccess() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((t) => t.stop())
}

const ERROR_MESSAGES = {
  'no-speech': "Didn't catch that. Try again a bit closer to the mic.",
  'audio-capture': 'No microphone found on this device.',
  network: 'Voice input needs a connection. Type it instead.',
}

// onInterim(text) fires continuously while speaking so the input can show live
// progress; onFinal(text) fires once when the user stops talking.
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

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      onError(`Microphone access is blocked for this site. ${micPermissionInstructions()}`)
      return
    }
    onError(ERROR_MESSAGES[event.error] || 'Voice input failed. Try again or type it.')
  }

  recognition.onend = () => onEnd()

  recognition.start()
  return recognition
}
