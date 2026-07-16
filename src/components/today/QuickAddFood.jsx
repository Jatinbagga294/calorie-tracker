import { useEffect, useRef, useState } from 'react'
import { Loader2, ArrowUp, ScanBarcode, Camera, Mic, Square } from 'lucide-react'
import { parseFoodText, parseFoodPhoto } from '../../lib/gemini'
import { searchProducts, lookupBarcode, looksLikeBrandedProduct } from '../../lib/openfoodfacts'
import { getFoodHistoryContext } from '../../lib/recents'
import { getPortionDefaults, getBiasFactors, recordCorrection } from '../../lib/corrections'
import { compressImage } from '../../lib/image'
import { isSpeechRecognitionSupported, startListening, requestMicAccess, micPermissionSteps } from '../../lib/speech'
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
  const [listening, setListening] = useState(false)
  const [requestingMic, setRequestingMic] = useState(false)
  const [micBlockedSteps, setMicBlockedSteps] = useState(null)
  const fileInputRef = useRef(null)
  const debounceRef = useRef(null)
  const searchSeq = useRef(0)
  const recognitionRef = useRef(null)
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

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function handleTextChange(e) {
    const value = e.target.value
    setText(value)
    searchSeq.current++
    if (!looksLikeBrandedProduct(value)) setSuggestions([])
  }

  // Toggle mic: tapping again while listening stops early (recognition also
  // auto-stops on a pause). Voice text is appended to whatever was typed.
  // Mic access is requested explicitly first (via getUserMedia) because
  // SpeechRecognition.start() alone doesn't reliably trigger the native
  // permission prompt on every Android Chrome version.
  async function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    setError('')
    setMicBlockedSteps(null)
    setRequestingMic(true)
    try {
      await requestMicAccess()
    } catch (err) {
      setRequestingMic(false)
      if (err.name === 'NotFoundError') setError('No microphone found on this device.')
      else setMicBlockedSteps(await micPermissionSteps())
      return
    }
    setRequestingMic(false)
    voiceBaseTextRef.current = text.trim()
    setListening(true)
    const join = (t) => (voiceBaseTextRef.current ? `${voiceBaseTextRef.current} ${t}` : t)
    recognitionRef.current = startListening({
      onInterim: (t) => setText(join(t)),
      onFinal: (t) => setText(join(t)),
      onError: (result) => {
        if (result.steps) setMicBlockedSteps(result.steps)
        else setError(result.message)
        setListening(false)
      },
      onEnd: () => setListening(false),
    })
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
    setMicBlockedSteps(null)
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
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={placeholder}
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
          {isSpeechRecognitionSupported() && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading || requestingMic}
              aria-label={listening ? 'Stop voice input' : 'Log by voice'}
              aria-pressed={listening}
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                listening
                  ? 'text-red-500 dark:text-red-300'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              } disabled:opacity-30`}
            >
              {requestingMic ? (
                <Loader2 size={19} className="animate-spin" aria-hidden />
              ) : listening ? (
                <Square size={16} className="animate-pulse" aria-hidden fill="currentColor" />
              ) : (
                <Mic size={19} aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || photoParsing || listening || requestingMic}
            aria-label="Log with a photo"
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
          >
            {photoParsing ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <Camera size={19} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={loading || lookingUp || listening || requestingMic}
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

      {micBlockedSteps && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Use the mic on your keyboard instead
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tap the text box, then the mic key on your keyboard, and just talk. No setup needed.
          </p>
          <details className="mt-2">
            <summary className="text-[13px] text-slate-400 dark:text-slate-500 cursor-pointer min-h-11 flex items-center">
              Or fix this app's mic button
            </summary>
            <ol className="mt-1 flex flex-col gap-1 list-decimal list-inside text-[13px] text-slate-500 dark:text-slate-400">
              {micBlockedSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        </div>
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
