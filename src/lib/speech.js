// Voice-to-text for the quick-add box. Wraps the Web Speech API (Chrome/Edge/
// Safari all ship SpeechRecognition under one prefix or another); on browsers
// without it the mic button simply doesn't render, no dead affordance.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access is off. Allow the microphone for this site in your browser settings.',
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
    onError(ERROR_MESSAGES[event.error] || 'Voice input failed. Try again or type it.')
  }

  recognition.onend = () => onEnd()

  recognition.start()
  return recognition
}
