import { useEffect, useRef, useState } from 'react'
import { Loader2, ArrowUp, ScanBarcode, Camera, Mic, Square } from 'lucide-react'
import { parseFoodText, parseFoodPhoto, transcribeSpeech } from '../../lib/gemini'
import { searchProducts, lookupBarcode, looksLikeBrandedProduct } from '../../lib/openfoodfacts'
import { getFoodHistoryContext } from '../../lib/recents'
import { getPortionDefaults, getBiasFactors, recordCorrection } from '../../lib/corrections'
import { compressImage } from '../../lib/image'
import { isSpeechRecognitionSupported, startListening, requestMicAccess } from '../../lib/speech'
import { isRecordingSupported, startRecording } from '../../lib/audio'
import BarcodeScanner from './BarcodeScanner'
import ProductConfirmSheet from './ProductConfirmSheet'
import PhotoConfirmSheet from './PhotoConfirmSheet'

const SEARCH_DEBOUNCE_MS = 500

// The one input. Typing is the default path; barcode (and camera, added with
// photo logging) ride inside the field as quiet icons. Database search never
// gets its own screen; likely packaged foods just surface under the box.
export default function QuickAddFood({ onLogged, onLoggedMany, placeholder = 'What did you eat?' }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [product, setProduct] = useState(null)
  const [photoParsing, setPhotoParsing] = useState(false)
  const [photoItems, setPhotoItems] = useState(null)
  // 'idle' | 'arming' (permission check) | 'listening' (live recognition) |
  // 'recording' (clip fallback) | 'transcribing' (clip at Gemini)
  const [voiceState, setVoiceState] = useState('idle')
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const searchSeq = useRef(0)
  const recognitionRef = useRef(null)
  const recorderRef = useRef(null)
  const voiceBaseTextRef = useRef('')

  // Inline database suggestions while typing something that looks packaged.
  useEffect(() => {
    if (!looksLikeBrandedProduct(text) || !navigator.onLine) return
    const seq = ++searchSeq.current
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchProducts(text, 3)
        if (searchSeq.current === seq) setSuggestions(results)
      } catch {
        // Suggestions are a bonus; typing and logging keeps working without them.
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [text])

  useEffect(
    () => () => {
      recognitionRef.current?.stop()
      recorderRef.current?.cancel()
    },
    [],
  )

  function handleTextChange(e) {
    const value = e.target.value
    setText(value)
    searchSeq.current++
    if (!looksLikeBrandedProduct(value)) setSuggestions([])
  }

  function joinVoice(transcript) {
    const base = voiceBaseTextRef.current
    return base ? `${base} ${transcript}` : transcript
  }

  // When the mic can't be used, the keyboard's own mic key works with zero
  // permissions. One line, cause-neutral; never send anyone into settings.
  // The focus is best-effort (mobile browsers won't open the keyboard from a
  // late programmatic focus), so the copy says to tap the box.
  function suggestKeyboardMic() {
    inputRef.current?.focus()
    setNotice('The mic did not work in the app this time. Tap the text box and use the mic key on your keyboard instead.')
  }

  // Voice input, layered so it never dead-ends:
  // 1. Live recognition (free, shows words as you talk).
  // 2. If the recognition service is broken but the mic is granted (installed
  //    PWA Chrome bug), silently switch to recording a clip for Gemini.
  // 3. If the mic is blocked entirely, open the keyboard and point at its mic
  //    key. Mic access goes through getUserMedia first because
  //    SpeechRecognition.start() alone doesn't reliably show the native
  //    permission prompt on Android Chrome.
  async function handleVoiceTap() {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop()
      return
    }
    if (voiceState === 'recording') {
      finishRecording()
      return
    }
    if (voiceState !== 'idle') return

    setError('')
    setNotice('')
    setVoiceState('arming')
    try {
      await requestMicAccess()
    } catch (err) {
      setVoiceState('idle')
      if (err.name === 'NotFoundError') setError('No microphone found on this device. Type it instead.')
      else if (err.name === 'NotReadableError') setError('The microphone is busy in another app. Close it and try again.')
      else suggestKeyboardMic()
      return
    }
    // Browsers without live recognition (e.g. Firefox on Android) go straight
    // to the clip recorder; same button, same result.
    if (isSpeechRecognitionSupported()) beginRecognition()
    else beginRecording()
  }

  function beginRecognition() {
    voiceBaseTextRef.current = text.trim()
    setVoiceState('listening')
    recognitionRef.current = startListening({
      onInterim: (t) => setText(joinVoice(t)),
      onFinal: (t) => setText(joinVoice(t)),
      onError: (kind) => {
        if (kind === 'no-speech') {
          setNotice("Didn't catch that. Try again a bit closer to the phone.")
          setVoiceState('idle')
        } else if (kind === 'service-broken') {
          // Mic permission is fine; only the recognition service refused.
          beginRecording()
        } else {
          setError('Voice input failed. Try again or type it.')
          setVoiceState('idle')
        }
      },
      // Only reset if recognition is still the active mode; the recorder
      // fallback may have taken over.
      onEnd: () => setVoiceState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }

  async function beginRecording() {
    if (!isRecordingSupported()) {
      setVoiceState('idle')
      suggestKeyboardMic()
      return
    }
    if (!navigator.onLine) {
      setVoiceState('idle')
      setError('You are offline. Voice input needs a connection.')
      return
    }
    // Claim the state before the awaits so recognition's trailing end event
    // can't reset to idle mid-takeover (and rapid taps can't double-start).
    setVoiceState('recording')
    try {
      recorderRef.current = await startRecording({ onAutoStop: finishRecording })
    } catch {
      setVoiceState('idle')
      suggestKeyboardMic()
    }
  }

  async function finishRecording() {
    const recorder = recorderRef.current
    if (!recorder) return
    recorderRef.current = null
    setVoiceState('transcribing')
    try {
      const audio = await recorder.stop()
      const transcript = audio ? await transcribeSpeech(audio) : ''
      if (transcript) {
        // Append to whatever is in the box now, not a stale snapshot; the
        // user may have kept typing while transcription ran.
        setText((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript))
      } else {
        setNotice("Didn't catch that. Try again a bit closer to the phone.")
      }
    } catch (err) {
      setError(err.message || 'Could not make that out. Type it instead.')
    } finally {
      setVoiceState('idle')
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || loading) return
    if (!navigator.onLine) {
      setError('You are offline. Logging needs a connection; your saved data is still here.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const parsed = await parseFoodText(text.trim())
      setText('')
      setSuggestions([])
      onLogged(parsed)
    } catch (err) {
      setError(err.message || 'That did not go through. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBarcode(code) {
    setScanning(false)
    setError('')
    setNotice('')
    if (!navigator.onLine) {
      setError('You are offline. Barcode lookup needs a connection.')
      return
    }
    setLookingUp(true)
    try {
      const found = await lookupBarcode(code)
      if (found) {
        setProduct(found)
      } else {
        setNotice('That barcode is not in the food database yet. Type what it is and log it that way.')
      }
    } catch (err) {
      setError(err.message || 'Lookup failed. Try again.')
    } finally {
      setLookingUp(false)
    }
  }

  function handleProductLog(entry) {
    setProduct(null)
    setText('')
    setSuggestions([])
    onLogged(entry)
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!navigator.onLine) {
      setError('You are offline. Photo logging needs a connection.')
      return
    }
    setError('')
    setNotice('')
    setPhotoParsing(true)
    try {
      const { base64, mimeType } = await compressImage(file)
      const history = getFoodHistoryContext() || {}
      const items = await parseFoodPhoto({
        base64,
        mimeType,
        note: text,
        userContext: {
          ...history,
          hour: new Date().getHours(),
          portionDefaults: getPortionDefaults(),
          biasFactors: getBiasFactors(),
        },
      })
      if (items.length === 0) {
        setNotice('No food found in that photo. Get the plate in the frame and try again.')
      } else {
        setPhotoItems(items)
      }
    } catch (err) {
      setError(err.message || 'Could not read that photo. Try again.')
    } finally {
      setPhotoParsing(false)
    }
  }

  // Confirmed photo items: log each as its own entry and persist every
  // adjustment (or confirmation) as a correction for future estimates.
  function handlePhotoLog(confirmed) {
    setPhotoItems(null)
    setText('')
    const entries = confirmed.map((item) => {
      recordCorrection({
        food: item.name,
        source: 'photo',
        estimated: item.estimated,
        corrected: item.final,
      })
      return {
        rawText: `${item.name}, about ${item.householdAmount}${item.multiplier !== 1 ? ` (adjusted)` : ''}`,
        grams: item.final.grams,
        calories: item.final.calories,
        protein: item.final.protein,
        carbs: item.final.carbs,
        fat: item.final.fat,
        fiber: item.final.fiber,
      }
    })
    if (onLoggedMany) onLoggedMany(entries)
    else entries.forEach(onLogged)
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-4 pr-2 py-2 shadow-sm shadow-slate-900/[0.04] dark:shadow-none focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={
              voiceState === 'listening'
                ? 'Listening, talk now'
                : voiceState === 'recording'
                  ? 'Talk, then tap the square'
                  : placeholder
            }
            className="flex-1 min-w-0 min-h-11 bg-transparent outline-none text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            disabled={loading}
            aria-label="Describe what you ate"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoFile}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
          {(isSpeechRecognitionSupported() || isRecordingSupported()) && (
            <button
              type="button"
              onClick={handleVoiceTap}
              disabled={loading}
              aria-label={
                voiceState === 'listening' || voiceState === 'recording'
                  ? 'Stop voice input'
                  : voiceState === 'idle'
                    ? 'Log by voice'
                    : 'Voice input is working'
              }
              aria-pressed={voiceState === 'listening' || voiceState === 'recording'}
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                voiceState === 'listening' || voiceState === 'recording'
                  ? 'text-red-500 dark:text-red-300'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              } disabled:opacity-30`}
            >
              {voiceState === 'arming' || voiceState === 'transcribing' ? (
                <Loader2 size={19} className="animate-spin" aria-hidden />
              ) : voiceState === 'listening' || voiceState === 'recording' ? (
                <Square size={16} className="animate-pulse" aria-hidden fill="currentColor" />
              ) : (
                <Mic size={19} aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || photoParsing || voiceState === 'listening' || voiceState === 'recording'}
            aria-label="Log with a photo"
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
          >
            {photoParsing ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <Camera size={19} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={loading || lookingUp || voiceState === 'listening' || voiceState === 'recording'}
            aria-label="Scan a barcode"
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
          >
            {lookingUp ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <ScanBarcode size={19} aria-hidden />}
          </button>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            aria-label="Log it"
            className="shrink-0 w-11 h-11 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-25 transition-opacity"
          >
            {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ArrowUp size={18} aria-hidden />}
          </button>
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.04] dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {suggestions.map((p) => (
            <button
              key={p.barcode || p.name}
              type="button"
              onClick={() => setProduct(p)}
              className="flex items-center justify-between gap-3 px-4 py-3 min-h-11 text-left active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                {p.brand && <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{p.brand}</span>}
              </span>
              {p.per100g.calories !== null && (
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {p.perServing?.calories != null
                    ? `${Math.round(p.perServing.calories)} cal / serving`
                    : `${Math.round(p.per100g.calories)} cal / 100g`}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 dark:text-red-300 px-1">{error}</p>}
      {notice && <p className="text-sm text-slate-500 dark:text-slate-400 px-1">{notice}</p>}

      {voiceState === 'recording' && (
        <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
          Recording. Talk, then tap the square to finish.
        </p>
      )}
      {voiceState === 'transcribing' && (
        <p className="text-sm text-slate-500 dark:text-slate-400 px-1">Working out what you said.</p>
      )}

      {photoParsing && (
        <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
          Reading your photo. A hand or fork in the shot helps with portions.
        </p>
      )}

      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}
      {product && <ProductConfirmSheet product={product} onLog={handleProductLog} onClose={() => setProduct(null)} />}
      {photoItems && (
        <PhotoConfirmSheet items={photoItems} onLog={handlePhotoLog} onClose={() => setPhotoItems(null)} />
      )}
    </div>
  )
}
