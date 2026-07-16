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

// The web-level permission state tells us exactly WHERE the mic is stuck:
// 'prompt' means the site was never even asked, so the block is at the OS
// level (Chrome itself has no Android mic permission and can't show the
// popup); 'denied' means the site itself was blocked in the browser;
// 'granted' means permission is fine and the mic is busy or broken.
async function micPermissionState() {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state
  } catch {
    return 'unknown'
  }
}

// Installed home-screen apps have no address bar and hold no Android
// permissions of their own — they ride on the browser's permission for this
// site, so recovery steps have to route through the browser or the OS.
export async function micPermissionSteps() {
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = isStandalone()
  const state = await micPermissionState()

  if (iOS) {
    return standalone
      ? ['Open the iPhone Settings app.', 'Scroll down to find this app in the list.', 'Turn on Microphone.', 'Reopen this app.']
      : ['Open Settings, then Safari (or your browser).', 'Turn on Microphone.', 'Reload this page.']
  }

  if (state === 'granted') {
    return ['Another app may be holding the microphone. Close other apps that could be using it, then try again.']
  }

  // Never prompted: Android is blocking the popup because Chrome itself has
  // no microphone permission. Fixing that is the whole fix; after it, the
  // prompt can appear right here, even inside the installed app.
  if (state === 'prompt') {
    return [
      "Open your phone's Settings, then Apps, then Chrome.",
      'Tap Permissions, then Microphone, and choose Allow.',
      'Come back and tap the mic again. This time a popup will ask, choose Allow.',
    ]
  }

  // Site-level block in the browser.
  if (standalone) {
    return [
      `Open Chrome and go to ${location.hostname}`,
      'Tap the lock icon by the address bar, then Permissions.',
      'Set Microphone to Allow.',
      'Close and reopen this app. It uses the same permission as Chrome.',
    ]
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

  recognition.onerror = async (event) => {
    if (event.error === 'not-allowed') {
      onError({ steps: await micPermissionSteps() })
      return
    }
    onError({ message: ERROR_MESSAGES[event.error] || 'Voice input failed. Try again or type it.' })
  }

  recognition.onend = () => onEnd()

  recognition.start()
  return recognition
}
