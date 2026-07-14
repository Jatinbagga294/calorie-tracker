import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Camera sheet that reports the first barcode it reads. Uses the native
// BarcodeDetector (Android Chrome); falls back to zxing loaded on demand
// (iOS Safari) so the main bundle stays lean.

const FORMATS = ['ean_13', 'upc_a', 'ean_8']

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let cancelled = false
    let rafId = null
    let zxingReader = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
      } catch {
        setError('Camera access is off. Allow camera for this site in your browser settings, then try again.')
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      video.srcObject = stream
      await video.play().catch(() => {})

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: FORMATS })
        const scan = async () => {
          if (cancelled) return
          try {
            if (video.readyState >= 2) {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0) {
                onDetected(barcodes[0].rawValue)
                return
              }
            }
          } catch {
            // A single failed frame is not fatal; keep scanning.
          }
          rafId = requestAnimationFrame(scan)
        }
        rafId = requestAnimationFrame(scan)
      } else {
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (cancelled) return
          zxingReader = new BrowserMultiFormatReader()
          zxingReader.decodeFromVideoElement(video, (result) => {
            if (result && !cancelled) onDetected(result.getText())
          })
        } catch {
          setError('Barcode scanning is not supported in this browser. Type the food instead.')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (zxingReader) zxingReader.stopContinuousDecode?.()
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col" role="dialog" aria-label="Scan a barcode">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Point at the barcode</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10"
        >
          <X size={18} />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
            <div className="w-64 h-40 rounded-2xl border-2 border-white/70" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/80">
            <p className="text-white text-sm text-center leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
