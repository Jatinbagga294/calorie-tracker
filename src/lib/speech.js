// Voice-to-text for the quick-add box. Wraps the Web Speech API (Chrome/Edge/
// Safari all ship SpeechRecognition under one prefix or another); on browsers
// without it the mic button simply doesn't render, no dead affordance.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function isStandalone() {
  return (
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  )
}

// Installed home-screen apps have no address bar, so there's no lock icon to
// tap. On Android the installed app does not hold its own mic permission
// either (Android's App Info shows none) — it borrows the permission Chrome
// has for this website. So the fix is to open the site in Chrome once and
// allow the mic there; the installed app inherits it. iOS PWAs hand
// permission control to Settings > the browser (or the app on newer iOS).
export function micPermissionSteps() {
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = isStandalone()

  if (standalone && !iOS) {
    return [
      `Open Chrome and go to ${location.hostname}`,
      'Tap the mic icon there and choose Allow when Chrome asks.',
      "If no popup shows: tap the lock icon by the address bar, then Permissions, set Microphone to Allow.",
      'Close and reopen this app. It uses the same permission as Chrome.',
    ]
  }
  if (standalone && iOS) {
    return [
      'Open the iPhone Settings app.',
      'Scroll down to find this app in the list.',
      'Turn on Microphone.',
      'Reopen this app.',
    ]
  }
  if (iOS) {
    return ['Open Settings, then Safari (or your browser).', 'Turn on Microphone.', 'Reload this page.']
  }
  return [
    'Tap the lock or info icon next to the address bar.',
    'Open Permissions (or Site settings).',
    'Set Microphone to Allow.',
    'Reload this page.',
  ]
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
// progress; onFinal(text) fires once when the user stops talking. onError
// receives either { message } for an ordinary failure or { steps } when the
// mic is blocked and needs a settings change.
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
      onError({ steps: micPermissionSteps() })
      return
    }
    onError({ message: ERROR_MESSAGES[event.error] || 'Voice input failed. Try again or type it.' })
  }

  recognition.onend = () => onEnd()

  recognition.start()
  return recognition
}
