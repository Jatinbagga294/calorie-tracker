// Open Food Facts: free, no API key. Search and barcode lookups share one
// normalizer because both endpoints return the same product shape.

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'

const FETCH_TIMEOUT_MS = 8000

function fetchWithTimeout(url) {
  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Normalizes a product into { name, brand, servingGrams, per100g, perServing, complete }.
// Missing nutriments stay null so the UI can ask the user instead of logging zeros.
export function normalizeProduct(product) {
  if (!product) return null
  const n = product.nutriments || {}

  const per100g = {
    calories: num(n['energy-kcal_100g']),
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    fiber: num(n.fiber_100g),
  }

  // No usable data at all -> not worth showing.
  if (per100g.calories === null && per100g.protein === null && per100g.carbs === null && per100g.fat === null) {
    return null
  }

  const name = (product.product_name || '').trim()
  if (!name) return null

  // serving_size is free text like "30 g" or "2 cookies (28 g)"; take the gram figure.
  const servingMatch = /([\d.]+)\s*g/i.exec(product.serving_size || '')
  const servingGrams = servingMatch ? Number(servingMatch[1]) : null

  const scale = (v, grams) => (v === null || grams === null ? null : (v * grams) / 100)
  const perServing = servingGrams
    ? {
        calories: scale(per100g.calories, servingGrams),
        protein: scale(per100g.protein, servingGrams),
        carbs: scale(per100g.carbs, servingGrams),
        fat: scale(per100g.fat, servingGrams),
        fiber: scale(per100g.fiber, servingGrams),
      }
    : null

  return {
    name,
    brand: (product.brands || '').split(',')[0].trim() || null,
    barcode: product.code || null,
    servingSizeText: product.serving_size || null,
    servingGrams,
    per100g,
    perServing,
    complete: Object.values(per100g).every((v) => v !== null),
  }
}

export async function searchProducts(query, limit = 5) {
  const url = `${SEARCH_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit * 3}&fields=code,product_name,brands,serving_size,nutriments`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error('Food database is not responding. Try again.')
  const data = await res.json()
  return (data.products || [])
    .map(normalizeProduct)
    .filter(Boolean)
    .slice(0, limit)
}

// Returns null when the barcode isn't in the database (a normal case, not an error).
export async function lookupBarcode(barcode) {
  const url = `${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments`
  const res = await fetchWithTimeout(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Food database is not responding. Try again.')
  const data = await res.json()
  if (data.status === 0 || !data.product) return null
  return normalizeProduct(data.product)
}

// Heuristic: does typed text look like a branded/packaged product worth a
// database hit? Capitalized multiword brands, or words like bar/chips/biscuit.
const PACKAGED_HINTS =
  /\b(bar|bars|chips|crisps|biscuit|biscuits|cookie|cookies|chocolate|soda|cola|drink|shake|yogurt|yoghurt|cereal|granola|protein|maggi|kurkure|lays|oreo|kitkat|dairy milk|bournvita|horlicks|nutella|snickers)\b/i

export function looksLikeBrandedProduct(text) {
  const trimmed = text.trim()
  if (trimmed.length < 3) return false
  if (PACKAGED_HINTS.test(trimmed)) return true
  // Two+ capitalized words mid-sentence reads like a brand name ("Amul Butter").
  const capitalized = trimmed.match(/\b[A-Z][a-z]+/g) || []
  return capitalized.length >= 2
}
