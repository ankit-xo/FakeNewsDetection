import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://fake-news-detection-api-8zp1.onrender.com'
).replace(/\/$/, '')

const endpoint = (path) => `${API_BASE}${path}`
const REQUEST_TIMEOUT_MS = 15000

function extractServerMessage(payload) {
  if (!payload || typeof payload !== 'object') return ''

  const directCandidates = [payload.message, payload.note, payload.error]
  const directText = directCandidates.find((item) => typeof item === 'string' && item.trim().length > 0)
  if (directText) return directText.trim()

  if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
    return payload.detail.trim()
  }

  if (Array.isArray(payload.detail)) {
    const firstArrayText = payload.detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (!item || typeof item !== 'object') return ''
        if (typeof item.msg === 'string') return item.msg
        if (typeof item.message === 'string') return item.message
        if (typeof item.error === 'string') return item.error
        return ''
      })
      .find((item) => item.trim().length > 0)

    if (firstArrayText) return firstArrayText.trim()
  }

  if (payload.detail && typeof payload.detail === 'object') {
    const detailObjectCandidates = [payload.detail.msg, payload.detail.message, payload.detail.error]
    const detailObjectText = detailObjectCandidates.find((item) => typeof item === 'string' && item.trim().length > 0)
    if (detailObjectText) return detailObjectText.trim()
  }

  return ''
}

function resolveApiErrorMessage(status, context, serverMessage = '') {
  if (serverMessage) return serverMessage

  if (status === 400) {
    if (context === 'predict-image') {
      return 'Invalid image input. Please upload a clear PNG/JPG/WEBP file and try again.'
    }
    return 'Invalid request. Please review your input and try again.'
  }

  if (status === 413) {
    return 'Input is too large. Please reduce text/image size and retry.'
  }

  if (status === 415) {
    return 'Unsupported file type. Please upload PNG, JPG, or WEBP.'
  }

  if (status === 422) {
    return 'Input format is not valid. Please check required fields and submit again.'
  }

  if (status === 429) {
    return 'Too many requests right now. Please wait a few seconds and try again.'
  }

  if (status >= 500) {
    return 'Server error occurred. Please retry in a moment.'
  }

  if (context === 'feedback') {
    return 'Feedback could not be submitted. Please try again.'
  }

  return 'Request failed. Please try again.'
}

function resolveNetworkErrorMessage(error, context) {
  if (error?.name === 'AbortError') {
    return 'Request timed out. Please retry.'
  }

  if (context === 'feedback') {
    return 'Unable to submit feedback right now. Check connection and retry.'
  }

  if (context === 'health') {
    return 'Health check failed. API may be unreachable.'
  }

  return 'Unable to connect to backend. Check connection and retry.'
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const TEAM_MEMBERS = [
  { name: 'Ankit Anand', role: 'Full Stack Developer', lead: true },
  { name: 'Anubhav Gangwar', role: 'Backend Developer' },
  { name: 'Manjeet Kumar', role: 'Software Testing' },
]

const MODEL_SNAPSHOT = [
  { value: '98.75%', label: 'Validation Accuracy' },
  { value: '98.69%', label: '5-Fold CV Accuracy' },
  { value: '84.79%', label: 'Real-world Accuracy' },
  { value: '38.8K', label: 'Clean Training Samples' },
  { value: '18 Feb 2026', label: 'Last Trained' },
]

const ABOUT_MODEL_CREDIBILITY = [
  { value: '98.75%', label: 'Validation Accuracy' },
  { value: '98.69%', label: 'Cross-Validation' },
  { value: '84.79%', label: 'Real-world Accuracy' },
  { value: '0.30%', label: 'Overfitting Gap' },
  { value: '18 Feb 2026', label: 'Last Trained' },
]

const HERO_MODEL_SNAPSHOT = [
  { value: '98.75%', label: 'Validation Accuracy' },
  { value: '84.79%', label: 'Real-world Accuracy' },
  { value: '89', label: 'Fake->Real Errors (benchmark)' },
]

const HISTORY_STORAGE_KEY = 'fake-news-history-v1'

const REAL_SAMPLE_NEWS_TEXTS = [
  'District administration released an official flood advisory and opened relief camps in low-lying areas.',
  'Election office published updated voter turnout data on the state portal after phase two polling.',
  'Meteorological department forecast heavy rainfall for coastal districts and issued orange alert for 48 hours.',
  'Health department started a free vaccination drive at government hospitals from Monday to Friday.',
  'University examination cell postponed semester exams by one week through a signed circular.',
  'Central bank kept policy rates unchanged and shared the decision in its scheduled monetary briefing.',
  'Space agency completed a successful payload test and published mission details in a press note.',
  'Railway division announced revised train timings due to platform maintenance during the weekend.',
  'City police confirmed recovery of a missing child and thanked citizens for verified leads.',
  'Supreme Court uploaded the next hearing schedule in the official cause list for public access.',
  'Municipal corporation inaugurated a new water treatment unit to improve local drinking water supply.',
  'Transport department launched a road safety campaign and increased highway patrolling this month.',
  'Parliament passed the amendment bill after debate and voting in both houses.',
  'State board declared class 12 results on its official website at the announced time.',
  'Agriculture ministry released updated crop support prices for the upcoming procurement season.',
  'Power utility announced a planned maintenance outage for selected areas between 1 AM and 4 AM.',
  'Public works department opened a repaired bridge after structural safety clearance.',
  'Airport authority issued fog-related advisory and asked passengers to check live flight status.',
  'National highway agency opened an additional service lane to reduce peak-hour congestion.',
  'Census office enabled a correction window for submitted forms with identity proof verification.',
  'Telecom regulator extended digital KYC submission deadline and notified operators formally.',
  'Bank notified customers about branch relocation effective next month through SMS and website notice.',
  'Fire department conducted a mock evacuation drill in a multi-storey market complex.',
  'University published annual placement statistics with recruiter list and salary ranges.',
  'Election commission clarified circulating booth-change rumors and shared the official booth lookup link.',
]

const FAKE_SAMPLE_NEWS_TEXTS = [
  'Viral post claims the moon will turn green tonight and anyone who watches it will become lucky forever.',
  'Forwarded message says all ATM notes will stop working after midnight unless people register immediately.',
  'Social post promises instant government cash reward through an unknown short link without any official source.',
  'Message says eating one herbal leaf can permanently cure diabetes in two days with zero medical evidence.',
  'Screenshot claims all board exams are canceled permanently, but no education notice is attached.',
  'Audio clip alleges vaccines contain secret tracking chips controlled by satellites.',
  'Post says a famous actor was jailed last night, but provides no police report or news source.',
  'Forward says nationwide internet shutdown starts tomorrow, yet no telecom or ministry advisory exists.',
  'Old bridge-collapse photo is reshared as today’s disaster without date or location verification.',
  'Post claims river water turned red due to poison dumping, but no lab or authority report is shown.',
  'Message says courts banned social media use after 10 PM, with no legal order reference.',
  'Viral text claims train tickets are free for everyone this week if they share the post 10 times.',
  'Forward warns a solar eclipse causes instant blindness in minutes, presented without scientific evidence.',
  'Post says drinking hot water every hour can kill every virus regardless of infection.',
  'Fake graphic claims a cash bonus is available only to people who reshare a random message.',
  'Screenshot says petrol is available at extremely low price today only, without any official notification.',
  'Message claims private schools must admit all students automatically without documents this year.',
  'Post alleges city tap water has sleeping medicine mixed by unknown groups.',
  'Forward claims exam papers leaked everywhere but shows no verified proof or authority statement.',
  'Viral post says all SIM cards will be blocked unless users enter OTP on an unknown page.',
  'Message promises old coins can be sold for huge guaranteed profit through unofficial agents.',
  'Conspiracy post claims satellites discovered a hidden city and government is suppressing the evidence.',
  'Message predicts an earthquake at exact minute and asks residents to leave homes immediately.',
  'Post claims tax department waived all penalties this week though no official circular exists.',
  'Screenshot promotes an app that claims to generate legal identity cards instantly without verification.',
]

const SAMPLE_NEWS_TEXTS = [...REAL_SAMPLE_NEWS_TEXTS, ...FAKE_SAMPLE_NEWS_TEXTS]

const BASE_FACT_CHECK_TIPS = [
  'Check source domain credibility and verify the original publisher.',
  'Verify publish date, location, and whether old content is being reposted as new.',
  'Cross-check the same claim on at least two trusted outlets.',
]

const FALLBACK_REASONS = {
  REAL: [
    'Language patterns are closer to factual reporting.',
    'No strong manipulation markers were detected.',
    'Overall signal supports a likely authentic claim.',
  ],
  FAKE: [
    'Claim style appears sensational or weakly sourced.',
    'Credibility signals are lower than expected for verified reporting.',
    'Pattern looks similar to misinformation-style content.',
  ],
}

function emptyResult(note = null) {
  return {
    result: null,
    prob: null,
    input_text: '',
    fake_reasons: null,
    fake_reasons_list: [],
    verification_tips: [],
    note,
  }
}

function uniqueItems(items) {
  const seen = new Set()
  const cleaned = []

  for (const item of items) {
    const text = String(item || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(text)
  }

  return cleaned
}

function parseReasonText(reasonText) {
  if (!reasonText) return []
  return String(reasonText)
    .split(/[.\n;]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildTopReasons(resultPayload, mode, confidence) {
  if (!resultPayload?.result) return []

  const reasons = []
  const resultType = resultPayload.result === 'FAKE' ? 'FAKE' : 'REAL'

  if (Array.isArray(resultPayload.fake_reasons_list)) {
    reasons.push(...resultPayload.fake_reasons_list)
  }
  reasons.push(...parseReasonText(resultPayload.fake_reasons))

  if (confidence) {
    if (resultType === 'REAL') {
      reasons.unshift(`Confidence score is ${confidence}%, indicating stronger reliability signals.`)
    } else {
      reasons.unshift(`Confidence score is ${confidence}%, indicating weak credibility signals.`)
    }
  }

  if (mode === 'image' && resultType === 'FAKE') {
    reasons.push('Image-extracted text appears inconsistent with reliable reporting style.')
  }

  reasons.push(...FALLBACK_REASONS[resultType])

  return uniqueItems(reasons).slice(0, 3)
}

function buildFactCheckTips(resultPayload, mode) {
  const dynamicTips = Array.isArray(resultPayload?.verification_tips) ? resultPayload.verification_tips : []
  const modeTip =
    mode === 'image'
      ? 'Run a reverse image search to detect reused, edited, or out-of-context visuals.'
      : 'Search the exact headline text on trusted sources to validate context.'

  return uniqueItems([modeTip, ...dynamicTips, ...BASE_FACT_CHECK_TIPS]).slice(0, 5)
}

function readHistory() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 5)
  } catch {
    return []
  }
}

function writeHistory(items) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 5)))
  } catch {
    // Ignore storage failures on restricted browsers.
  }
}

function formatHistoryTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Recent'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function createDemoImageFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return Promise.reject(new Error('Canvas not supported'))
  }

  ctx.fillStyle = '#f8fbff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#1e3a8a'
  ctx.font = '700 56px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('Breaking Claim Screenshot', 72, 110)

  ctx.fillStyle = '#475569'
  ctx.font = '500 36px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('Post says "Miracle cure found in 24 hours"', 72, 190)
  ctx.fillText('No doctor names, no study links, asks to forward now.', 72, 245)

  ctx.fillStyle = '#dc2626'
  ctx.font = '700 42px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('VERIFY BEFORE SHARING', 72, 330)

  ctx.strokeStyle = '#d0def7'
  ctx.lineWidth = 4
  ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104)

  ctx.fillStyle = '#1f2937'
  ctx.font = '500 30px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('Sample demo image generated by Fake News Detection app', 72, 645)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create demo image'))
          return
        }

        resolve(new File([blob], 'demo-news-image.png', { type: 'image/png' }))
      },
      'image/png',
      0.9,
    )
  })
}

function pickSampleNews(currentText = '') {
  if (!SAMPLE_NEWS_TEXTS.length) return ''
  if (SAMPLE_NEWS_TEXTS.length === 1) return SAMPLE_NEWS_TEXTS[0]

  const normalizedCurrent = String(currentText || '').trim()
  const filtered = SAMPLE_NEWS_TEXTS.filter((item) => item !== normalizedCurrent)
  const source = filtered.length ? filtered : SAMPLE_NEWS_TEXTS
  const index = Math.floor(Math.random() * source.length)
  return source[index]
}


const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || ''

function withBasePath(path) {
  if (!BASE_PATH) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${normalizedPath}`
}

function stripBasePath(pathname) {
  if (!BASE_PATH) return pathname
  if (pathname === BASE_PATH) return '/'
  return pathname.startsWith(`${BASE_PATH}/`) ? pathname.slice(BASE_PATH.length) : pathname
}

function readRouteFromPath() {
  const path = (stripBasePath(window.location.pathname || '/') || '/').toLowerCase().replace(/\/+$/, '') || '/'

  if (path === '/home' || path === '/') {
    return { activePage: 'home', activeNav: 'home', mode: 'text' }
  }

  if (path === '/text-check') {
    return { activePage: 'analyzer', activeNav: 'text', mode: 'text' }
  }

  if (path === '/image-check') {
    return { activePage: 'analyzer', activeNav: 'image', mode: 'image' }
  }

  if (path === '/feedback') {
    return { activePage: 'feedback', activeNav: 'feedback', mode: 'text' }
  }

  if (path === '/about') {
    return { activePage: 'about', activeNav: 'about', mode: 'text' }
  }

  return { activePage: 'home', activeNav: 'home', mode: 'text' }
}

function stateToPath(activePage, mode) {
  if (activePage === 'analyzer') {
    return mode === 'image' ? '/image-check' : '/text-check'
  }

  if (activePage === 'feedback') {
    return '/feedback'
  }

  if (activePage === 'about') {
    return '/about'
  }

  return '/home'
}

function App() {
  const logoSrc = withBasePath('/assets/logo.png')
  const logoWebpSrc = withBasePath('/assets/logo.webp')
  const architectureSrc = withBasePath('/assets/architecture-diagram.svg')
  const initialRoute = readRouteFromPath()
  const [mode, setMode] = useState(initialRoute.mode)
  const [activeNav, setActiveNav] = useState(initialRoute.activeNav)
  const [activePage, setActivePage] = useState(initialRoute.activePage)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileHeaderMode, setMobileHeaderMode] = useState(false)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [demoImageLoading, setDemoImageLoading] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [retryContext, setRetryContext] = useState(null)
  const [retryFeedbackType, setRetryFeedbackType] = useState('')
  const [historyItems, setHistoryItems] = useState(() => readHistory())
  const [apiHealth, setApiHealth] = useState({
    status: 'checking',
    modelLoaded: false,
    checkedAt: null,
  })
  const [healthChecking, setHealthChecking] = useState(false)
  const topbarInnerRef = useRef(null)
  const brandWrapRef = useRef(null)
  const navMeasureRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const nav = window.navigator
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection

    const applyLowEndMode = () => {
      const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2
      const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2
      const saveData = Boolean(connection?.saveData)
      const effectiveType = connection?.effectiveType || ''
      const slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g'
      const lowEndMode = lowMemory || (lowCpu && slowNetwork) || (saveData && slowNetwork)

      document.documentElement.classList.toggle('low-end-mode', lowEndMode)
    }

    applyLowEndMode()
    connection?.addEventListener?.('change', applyLowEndMode)

    return () => {
      connection?.removeEventListener?.('change', applyLowEndMode)
      document.documentElement.classList.remove('low-end-mode')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  useEffect(() => {
    const syncFromPath = () => {
      const next = readRouteFromPath()
      setActivePage(next.activePage)
      setActiveNav(next.activeNav)
      setMode(next.mode)
    }

    window.addEventListener('popstate', syncFromPath)
    return () => window.removeEventListener('popstate', syncFromPath)
  }, [])

  useEffect(() => {
    const nextPath = withBasePath(stateToPath(activePage, mode))
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
  }, [activePage, mode])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activePage, activeNav, mode])

  const evaluateHeaderMode = useCallback(() => {
    const topbarInner = topbarInnerRef.current
    const brandWrap = brandWrapRef.current
    const navMeasure = navMeasureRef.current

    if (!topbarInner || !brandWrap || !navMeasure) return

    if (window.innerWidth <= 760) {
      setMobileHeaderMode(true)
      return
    }

    const availableWidth = topbarInner.clientWidth
    const brandWidth = brandWrap.offsetWidth
    const navWidth = navMeasure.scrollWidth
    const mobileSwitchGapPx = 6
    const mobileExitGapPx = 14
    const remainingGap = availableWidth - brandWidth - navWidth

    setMobileHeaderMode((current) => {
      if (!current) {
        return remainingGap <= mobileSwitchGapPx
      }
      return remainingGap <= mobileExitGapPx
    })
  }, [])

  useLayoutEffect(() => {
    evaluateHeaderMode()
  }, [evaluateHeaderMode])

  useEffect(() => {
    let frameId = 0
    const scheduleEvaluation = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
      frameId = requestAnimationFrame(() => {
        frameId = 0
        evaluateHeaderMode()
      })
    }

    const handleResize = () => scheduleEvaluation()
    window.addEventListener('resize', handleResize)

    let observer = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => scheduleEvaluation())
      if (topbarInnerRef.current) observer.observe(topbarInnerRef.current)
      if (brandWrapRef.current) observer.observe(brandWrapRef.current)
      if (navMeasureRef.current) observer.observe(navMeasureRef.current)
    }

    let isCancelled = false
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!isCancelled) scheduleEvaluation()
      })
    }

    return () => {
      isCancelled = true
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', handleResize)
      observer?.disconnect()
    }
  }, [evaluateHeaderMode])

  useEffect(() => {
    if (!mobileHeaderMode) {
      setMobileMenuOpen(false)
    }
  }, [mobileHeaderMode])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  const checkApiHealth = useCallback(async () => {
    setHealthChecking(true)

    try {
      const response = await fetchWithTimeout(endpoint('/api/health'), {}, 8000)
      if (!response.ok) {
        throw new Error('Health check failed')
      }

      const data = await safeJson(response)
      setApiHealth({
        status: 'online',
        modelLoaded: Boolean(data.model_loaded),
        checkedAt: new Date().toISOString(),
      })
    } catch {
      setApiHealth({
        status: 'offline',
        modelLoaded: false,
        checkedAt: new Date().toISOString(),
      })
    } finally {
      setHealthChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkApiHealth()
    const timer = window.setInterval(() => {
      void checkApiHealth()
    }, 120000)

    return () => window.clearInterval(timer)
  }, [checkApiHealth])

  const confidence = useMemo(() => {
    if (typeof result?.prob !== 'number') return null
    return (result.prob * 100).toFixed(2)
  }, [result])

  const topReasons = useMemo(() => buildTopReasons(result, mode, confidence), [result, mode, confidence])

  const factCheckTips = useMemo(() => buildFactCheckTips(result, mode), [result, mode])

  const apiHealthLabel = useMemo(() => {
    if (apiHealth.status === 'online') {
      return apiHealth.modelLoaded ? 'API Online • Model Ready' : 'API Online • Model Loading'
    }

    if (apiHealth.status === 'offline') {
      return 'API Offline'
    }

    return 'Checking API...'
  }, [apiHealth])

  const textStats = useMemo(() => {
    const trimmed = text.trim()
    return {
      chars: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
    }
  }, [text])

  const appendHistory = (payload, predictionMode, fallbackInput = '') => {
    if (!payload?.result) return

    const normalizedInput = String(payload.input_text || fallbackInput || '')
      .replace(/\s+/g, ' ')
      .trim()
    const excerpt = normalizedInput
      ? `${normalizedInput.slice(0, 110)}${normalizedInput.length > 110 ? '...' : ''}`
      : predictionMode === 'image'
        ? 'Image input analyzed'
        : 'Text input analyzed'

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      mode: predictionMode,
      result: payload.result,
      confidence: typeof payload.prob === 'number' ? Number((payload.prob * 100).toFixed(2)) : null,
      excerpt,
      checkedAt: new Date().toISOString(),
    }

    setHistoryItems((current) => {
      const deduped = [
        entry,
        ...current.filter(
          (item) => !(item.mode === entry.mode && item.result === entry.result && item.excerpt === entry.excerpt),
        ),
      ]
      const next = deduped.slice(0, 5)
      writeHistory(next)
      return next
    })
  }

  const runTextPrediction = async () => {
    const cleanedText = text.trim()
    setRetryContext(null)
    setRetryFeedbackType('')

    if (!cleanedText) {
      setResult(emptyResult('Please enter news text.'))
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchWithTimeout(endpoint('/api/predict'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanedText }),
      })

      const data = await safeJson(response)
      if (!response.ok) {
        setResult(null)
        setError(resolveApiErrorMessage(response.status, 'predict-text', extractServerMessage(data)))
        setRetryContext('predict-text')
        return
      }

      setResult(data)
      setFeedback('')
      setError('')
      setRetryContext(null)
      appendHistory(data, 'text', cleanedText)
    } catch (requestError) {
      setResult(null)
      setError(resolveNetworkErrorMessage(requestError, 'predict-text'))
      setRetryContext('predict-text')
    } finally {
      setLoading(false)
    }
  }

  const runImagePrediction = async () => {
    setRetryContext(null)
    setRetryFeedbackType('')

    if (!imageFile) {
      setResult(emptyResult('Please upload an image first.'))
      setError('')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('image', imageFile)

    try {
      const response = await fetchWithTimeout(endpoint('/api/predict-image'), {
        method: 'POST',
        body: formData,
      })

      const data = await safeJson(response)
      if (!response.ok) {
        setResult(null)
        setError(resolveApiErrorMessage(response.status, 'predict-image', extractServerMessage(data)))
        setRetryContext('predict-image')
        return
      }

      setResult(data)
      setFeedback('')
      if (data.input_text) {
        setText(data.input_text)
      }
      setError('')
      setRetryContext(null)
      appendHistory(data, 'image', data.input_text || imageFile.name)
    } catch (requestError) {
      setResult(null)
      setError(resolveNetworkErrorMessage(requestError, 'predict-image'))
      setRetryContext('predict-image')
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = (event) => {
    event.preventDefault()
    void runTextPrediction()
  }

  const handleImageSubmit = (event) => {
    event.preventDefault()
    void runImagePrediction()
  }

  const setImageFromFile = (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('Please upload a valid image file.')
      setRetryContext(null)
      setRetryFeedbackType('')
      return
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setError('')
    setRetryContext(null)
    setRetryFeedbackType('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setImageFromFile(file)
  }

  const handleDragEnter = (event) => {
    event.preventDefault()
    setIsDragActive(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)
    const file = event.dataTransfer?.files?.[0]
    if (!file) return

    setImageFromFile(file)

    if (fileInputRef.current && typeof DataTransfer !== 'undefined') {
      const transfer = new DataTransfer()
      transfer.items.add(file)
      fileInputRef.current.files = transfer.files
    }
  }

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsDragActive(false)
    setImagePreview('')
    setImageFile(null)
  }

  const loadTextDemo = () => {
    openAnalyzerPage('text', 'text')
    clearImage()
    setResult(null)
    setError('')
    setRetryContext(null)
    setRetryFeedbackType('')
    setFeedback('')
    setText((current) => pickSampleNews(current))
  }

  const loadImageDemo = async () => {
    openAnalyzerPage('image', 'image')
    setResult(null)
    setError('')
    setRetryContext(null)
    setRetryFeedbackType('')
    setFeedback('')
    setText('')

    setDemoImageLoading(true)
    try {
      const demoFile = await createDemoImageFile()
      setImageFromFile(demoFile)

      if (fileInputRef.current && typeof DataTransfer !== 'undefined') {
        const transfer = new DataTransfer()
        transfer.items.add(demoFile)
        fileInputRef.current.files = transfer.files
      }
    } catch {
      setError('Unable to load demo image.')
      setRetryContext(null)
      setRetryFeedbackType('')
    } finally {
      setDemoImageLoading(false)
    }
  }

  const handleFeedback = async (type) => {
    if (feedbackSubmitting || loading) return
    const feedbackText = result?.input_text || text

    if (!feedbackText?.trim()) {
      setError('No prediction available for feedback.')
      setRetryContext(null)
      setRetryFeedbackType('')
      return
    }

    setFeedbackSubmitting(true)
    setError('')
    setRetryContext(null)
    setRetryFeedbackType(type)

    try {
      const response = await fetchWithTimeout(endpoint('/api/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: type,
          text: feedbackText,
        }),
      })

      const data = await safeJson(response)
      if (!response.ok) {
        setError(resolveApiErrorMessage(response.status, 'feedback', extractServerMessage(data)))
        setRetryContext('feedback')
        setRetryFeedbackType(type)
        return
      }

      setFeedback(type)
      setError('')
      setRetryContext(null)
      setRetryFeedbackType('')
    } catch (requestError) {
      setError(resolveNetworkErrorMessage(requestError, 'feedback'))
      setRetryContext('feedback')
      setRetryFeedbackType(type)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const retryFailedRequest = () => {
    if (loading || feedbackSubmitting || !retryContext) return

    if (retryContext === 'predict-text') {
      void runTextPrediction()
      return
    }

    if (retryContext === 'predict-image') {
      void runImagePrediction()
      return
    }

    if (retryContext === 'feedback' && retryFeedbackType) {
      void handleFeedback(retryFeedbackType)
    }
  }

  const clearHistory = () => {
    setHistoryItems([])
    writeHistory([])
  }

  const setRoute = (nextPage, nextNav, nextMode = mode) => {
    setActivePage(nextPage)
    setActiveNav(nextNav)
    setMode(nextMode)
  }

  const setRouteFromMenu = (nextPage, nextNav, nextMode = mode) => {
    setRoute(nextPage, nextNav, nextMode)
    setMobileMenuOpen(false)
  }

  const openLandingPage = () => {
    setRoute('home', 'home', mode)
    setMobileMenuOpen(false)
  }

  const openAnalyzerPage = (nextMode = 'text', navTab = 'text') => {
    setRoute('analyzer', navTab, nextMode)
    setMobileMenuOpen(false)
    setError('')
    setRetryContext(null)
    setRetryFeedbackType('')
  }

  const handleClear = () => {
    setText('')
    clearImage()
    setResult(null)
    setFeedback('')
    setError('')
    setRetryContext(null)
    setRetryFeedbackType('')
    openAnalyzerPage('text', 'text')
  }

  const showResult = Boolean(result?.result || result?.note)
  const retryButtonLabel = retryContext === 'feedback' ? 'Retry Feedback' : 'Retry Prediction'

  const renderHomePage = () => (
    <>
      <section className="work-hero home-hero">
        <div className="hero-content">
          <h1>AI-powered Fake News Detection for faster verification</h1>
          <p className="hero-text">
            Analyze headlines, social posts, and screenshots with ML-based credibility scoring, confidence insights, and
            verification guidance before sharing.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-btn page-btn hero-btn" onClick={() => openAnalyzerPage('text', 'text')}>
              🚀 Start AI Check
            </button>
          </div>

          <div className="hero-highlights" aria-label="Platform highlights">
            <span className="hero-chip">🧠 AI-based credibility scoring</span>
            <span className="hero-chip">📊 Confidence analytics</span>
            <span className="hero-chip">🔍 Explainable results</span>
          </div>

          <div className="hero-snapshot">
            <p className="hero-snapshot-title">📌 Model Snapshot</p>
            <div className="hero-stats" aria-label="Model Snapshot">
              {HERO_MODEL_SNAPSHOT.map((item) => (
                <article key={`hero-${item.label}`} className="hero-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="info-card home-info-card">
        <div className="page-intro">
          <h2>✨ How This Platform Helps</h2>
          <p>
            This project helps users quickly evaluate suspicious news content and make informed decisions before sharing.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>📝 Text Verification</h3>
            <p>Paste headlines or full text and get a model prediction with confidence score.</p>
          </article>
          <article className="feature-card">
            <h3>🖼️ Image Verification</h3>
            <p>Upload social media screenshots or posters and check whether the content looks reliable.</p>
          </article>
          <article className="feature-card">
            <h3>✅ Actionable Insights</h3>
            <p>Read fake-news reasons and quick verification tips before trusting or forwarding information.</p>
          </article>
        </div>

        <div className="home-steps">
          <h3>🚦 Quick Start in 3 Steps</h3>
          <div className="steps-grid">
            <article className="step-card">
              <span className="step-count">01</span>
              <h4>🎛️ Choose Mode</h4>
              <p>Select 📝 Text Check or 🖼️ Image Check based on the content you want to verify.</p>
            </article>
            <article className="step-card">
              <span className="step-count">02</span>
              <h4>⚡ Run Prediction</h4>
              <p>Submit your input and get model output with confidence in a few seconds.</p>
            </article>
            <article className="step-card">
              <span className="step-count">03</span>
              <h4>🧾 Review Tips</h4>
              <p>Read reasons and verification tips before you trust or share that news.</p>
            </article>
          </div>
        </div>

        <section className="model-card-block" aria-label="Model card">
          <h3>🧠 Model Card</h3>
          <div className="model-card-grid">
            {MODEL_SNAPSHOT.map((item) => (
              <article key={`model-card-${item.label}`} className="model-card-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  )

  const renderAnalyzerPage = () => (
    <>
      <section className="work-hero" id="hero-section">
        <div className="work-pill">{mode === 'text' ? '📝 Text Check' : '🖼️ Image Check'}</div>
      </section>

      <section className="work-card" id="analyze-section">
        <div className="card-intro">
          <h2>🔎 Analyze News Content</h2>
          <p className="card-subtext">
            {mode === 'text'
              ? 'Paste news text below and get prediction, confidence, and reliability indicators.'
              : 'Upload an image of news content and let the model evaluate whether it looks reliable.'}
          </p>
        </div>

        <div className="analysis-badges" aria-label="Analyzer highlights">
          <span className="analysis-badge">⚡ Fast Prediction</span>
          <span className="analysis-badge">🎯 Model Confidence</span>
          <span className="analysis-badge">🧠 Clear Reasons</span>
        </div>

        <div className="api-health-row">
          <span className={`api-health-pill ${apiHealth.status}`}>{apiHealthLabel}</span>
          <button
            type="button"
            className="secondary-btn health-btn"
            onClick={() => void checkApiHealth()}
            disabled={healthChecking}
          >
            {healthChecking ? 'Checking...' : '🔄 Refresh Health'}
          </button>
        </div>

        <div className="demo-row" aria-label="Try demo checks">
          {mode === 'text' && (
            <button
              type="button"
              className="secondary-btn demo-btn"
              onClick={loadTextDemo}
              disabled={loading || demoImageLoading}
            >
              📰 Load Sample News
            </button>
          )}
          {mode === 'image' && (
            <button
              type="button"
              className="secondary-btn demo-btn"
              onClick={() => void loadImageDemo()}
              disabled={loading || demoImageLoading}
            >
              {demoImageLoading ? '🛠️ Preparing Sample Image...' : '🖼️ Try Sample Image'}
            </button>
          )}
        </div>

        {mode === 'text' ? (
          <form className="form" onSubmit={handleTextSubmit}>
            <textarea
              className="text-input"
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Enter the news here..."
              required
            />

            <div className="input-meta">
              <span>{textStats.words} words</span>
              <span>{textStats.chars} characters</span>
            </div>

            <button type="submit" className="primary-btn predict-btn" disabled={loading || demoImageLoading}>
              {loading ? (
                <span className="btn-label">
                  <span className="btn-spinner" aria-hidden="true" />
                  Predicting...
                </span>
              ) : (
                '🚀 Predict'
              )}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={handleImageSubmit}>
            <label
              htmlFor="news-image"
              className={`upload-box ${isDragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span className="upload-icon" aria-hidden="true">
                ⇪
              </span>
              <span className="upload-title">🖼️ Upload News Image</span>
              <span className="upload-subtitle">Drag and drop or click to browse</span>
              <span className="upload-subtitle">PNG, JPG, WEBP supported</span>
              <input
                id="news-image"
                ref={fileInputRef}
                className="file-input-hidden"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <div className="file-picker-row">
                <span className="file-picker-btn">Choose File</span>
                <span className={`file-name ${imageFile ? 'has-file' : ''}`}>
                  {imageFile ? imageFile.name : 'No file selected'}
                </span>
              </div>
            </label>

            <div className="input-meta">
              <span>Accepted: PNG, JPG, WEBP</span>
              <span>Drag and drop supported</span>
            </div>

            {imagePreview && (
              <div className="preview-block">
                <img src={imagePreview} alt="Preview" className="preview-image" />
                <button type="button" className="secondary-btn" onClick={clearImage}>
                  Remove Image
                </button>
              </div>
            )}

            <button type="submit" className="primary-btn predict-btn" disabled={loading || demoImageLoading}>
              {loading ? (
                <span className="btn-label">
                  <span className="btn-spinner" aria-hidden="true" />
                  🖼️ Reading Image...
                </span>
              ) : (
                '🚀 Predict'
              )}
            </button>
          </form>
        )}

        {error && (
          <div className="error-wrap">
            <p className="error-banner">{error}</p>
            {retryContext && !loading && !feedbackSubmitting && (
              <button type="button" className="secondary-btn retry-btn" onClick={retryFailedRequest}>
                {retryButtonLabel}
              </button>
            )}
          </div>
        )}

        {showResult && (
          <section className={`result-card ${result?.result === 'REAL' ? 'result-real' : ''} ${result?.result === 'FAKE' ? 'result-fake' : ''}`}>
            {result?.result && (
              <>
                <div className={`result-chip ${result.result === 'REAL' ? 'real' : 'fake'}`}>{result.result}</div>

                {confidence && (
                  <>
                    <div className="progress-wrap">
                      <div className={`progress-fill ${result.result === 'REAL' ? 'real' : 'fake'}`} style={{ width: `${confidence}%` }} />
                    </div>
                    <p className="confidence-text">Model confidence: {confidence}%</p>
                  </>
                )}

                <article className="insight-box">
                  <h3>🤔 Why this result?</h3>
                  <ul className="reason-list">
                    {topReasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>{reason}</li>
                    ))}
                  </ul>
                </article>

                <article className="tips-box result-tips">
                  <h4>✅ Fact-check tips</h4>
                  <ul className="tips-list">
                    {factCheckTips.map((tip, index) => (
                      <li key={`${tip}-${index}`}>{tip}</li>
                    ))}
                  </ul>
                </article>

                <p className="disclaimer-note">ℹ️ Disclaimer: AI-assisted prediction, not absolute truth.</p>

                <div className="feedback-row">
                  <span>Feedback ✍️:</span>
                  <button
                    type="button"
                    className={`feedback-btn ${feedback === 'real' ? 'selected' : ''}`}
                    onClick={() => handleFeedback('real')}
                    disabled={loading || feedbackSubmitting}
                  >
                    {feedbackSubmitting && retryFeedbackType === 'real' ? 'Submitting...' : 'Real'}
                  </button>
                  <button
                    type="button"
                    className={`feedback-btn ${feedback === 'fake' ? 'selected' : ''}`}
                    onClick={() => handleFeedback('fake')}
                    disabled={loading || feedbackSubmitting}
                  >
                    {feedbackSubmitting && retryFeedbackType === 'fake' ? 'Submitting...' : 'Fake'}
                  </button>
                  {feedbackSubmitting && <span className="feedback-status">Submitting feedback...</span>}
                </div>
              </>
            )}

            {result?.note && <p className="note-banner">{result.note}</p>}
          </section>
        )}

        <section className="history-card" aria-label="Recent checks">
          <div className="history-head">
            <h3>🕘 Recent Checks</h3>
            <button type="button" className="secondary-btn history-clear-btn" onClick={clearHistory} disabled={!historyItems.length}>
              🧹 Clear History
            </button>
          </div>

          {historyItems.length > 0 ? (
            <ul className="history-list">
              {historyItems.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-main">
                    <span className={`history-mode ${item.mode === 'image' ? 'image' : 'text'}`}>
                      {item.mode === 'image' ? 'Image' : 'Text'}
                    </span>
                    <strong className={`history-result ${item.result === 'REAL' ? 'real' : 'fake'}`}>{item.result}</strong>
                    {typeof item.confidence === 'number' && <span className="history-confidence">{item.confidence}%</span>}
                  </div>
                  <p>{item.excerpt}</p>
                  <span className="history-time">{formatHistoryTime(item.checkedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="history-empty">🧾 No checks yet. Run a prediction to save recent results here.</p>
          )}
        </section>

        <div className="footer-row">
          <button type="button" className="secondary-btn" onClick={handleClear} disabled={loading || feedbackSubmitting}>
            🧼 Clear
          </button>
        </div>
      </section>
    </>
  )

  const renderFeedbackPage = () => (
    <>
      <section className="work-hero page-hero">
        <div className="work-pill">💬 Feedback</div>
      </section>

      <section className="info-card">
        <div className="page-intro">
          <h2>🛠️ Help Us Improve Fake News Detection</h2>
          <p>
            Your feedback helps us improve model quality, user experience, and overall accuracy for both text and image
            checks.
          </p>
        </div>

        <div className="page-chip-row" aria-label="Feedback scope">
          <span className="page-chip">🧪 Accuracy Review</span>
          <span className="page-chip">🎨 UI Experience</span>
          <span className="page-chip">💡 Feature Suggestions</span>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>🎯 Model Accuracy</h3>
            <p>Report cases where the prediction looked incorrect so we can improve training quality.</p>
          </article>
          <article className="feature-card">
            <h3>🧭 User Experience</h3>
            <p>Share if anything feels confusing, slow, or difficult while using text check or image check.</p>
          </article>
          <article className="feature-card">
            <h3>✨ Feature Request</h3>
            <p>Suggest improvements like new checks, better explanations, or workflow enhancements.</p>
          </article>
        </div>

        <div className="about-panel">
            <h3>How to Submit Useful Feedback ✨</h3>
            <ul className="team-list">
            <li>Run a prediction from the 📝 Text Check or 🖼️ Image Check page.</li>
              <li>Use Real or Fake feedback buttons after result.</li>
              <li>Mention what looked wrong and why.</li>
            </ul>
          </div>

        <div className="about-layout feedback-layout">
          <article className="about-panel">
            <h3>🔄 What Happens After Feedback</h3>
            <p>
              Useful reports are reviewed and grouped into model improvement tasks, UI fixes, and quality checks for
              upcoming updates.
            </p>
          </article>
          <article className="about-panel">
            <h3>🤝 Best Way to Help</h3>
            <ul className="team-list">
              <li>Share the exact text or screenshot that was checked.</li>
              <li>Mention if prediction was false positive or false negative.</li>
              <li>Add one short reason so the case can be verified quickly.</li>
            </ul>
          </article>
        </div>

        <div className="feedback-contact">
          <p>
            📧 Have detailed feedback, bug reports, or ideas? We would love to hear from you at{' '}
            <a href="mailto:ankitsbuild@gmail.com?subject=Fake%20News%20Detection%20Feedback">ankitsbuild@gmail.com</a>.
          </p>
        </div>

        <div className="cta-row">
          <button
            type="button"
            className="primary-btn page-btn"
            onClick={() => openAnalyzerPage(mode === 'image' ? 'image' : 'text', mode === 'image' ? 'image' : 'text')}
          >
            🔍 Go to Analyzer
          </button>
        </div>
      </section>
    </>
  )

  const renderAboutPage = () => (
    <>
      <section className="work-hero page-hero">
        <div className="work-pill">👥 About Us</div>
      </section>

      <section className="info-card about-page-card">
        <div className="page-intro">
          <h2>About This Project 🚀</h2>
          <p>
            Fake News Detection is a practical ML project that checks whether news content is likely real or fake using
            text and image analysis.
          </p>
        </div>

        <div className="page-chip-row" aria-label="Project focus">
          <span className="page-chip">Machine Learning</span>
          <span className="page-chip">News Verification</span>
          <span className="page-chip">User-first UI</span>
        </div>

        <section className="model-card-block about-credibility-block" aria-label="Model credibility">
          <h3>📈 Model Credibility</h3>
          <p className="about-credibility-note">Latest snapshot after retraining and threshold tuning to reduce wrong flips.</p>
          <div className="model-card-grid about-credibility-grid">
            {ABOUT_MODEL_CREDIBILITY.map((item) => (
              <article key={`about-cred-${item.label}`} className="model-card-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <div className="about-layout">
          <article className="about-panel">
            <h3>Project Goal 🎯</h3>
            <p>
              Provide a simple and fast interface to verify news credibility and help users make better decisions before
              sharing information.
            </p>
          </article>
          <article className="about-panel">
            <h3>Core Modules 🧠</h3>
            <ul className="team-list">
              <li>Text news classification</li>
              <li>Image-based prediction</li>
              <li>Confidence scoring and fake reason highlights</li>
              <li>User feedback collection for future improvement</li>
            </ul>
          </article>
        </div>

        <div className="stack-section">
          <h3>Tech Stack</h3>
          <div className="stack-grid">
            <span className="stack-pill">React + Vite</span>
            <span className="stack-pill">FastAPI</span>
            <span className="stack-pill">Scikit-learn</span>
            <span className="stack-pill">OCR + NLP Pipeline</span>
          </div>
        </div>

        <section className="architecture-section">
          <h3>🧩 Methodology Architecture</h3>
          <p>Frontend sends text/image input to FastAPI, API runs preprocessing and model inference, then returns insights.</p>
          <img
            src={architectureSrc}
            alt="Architecture diagram showing Frontend, FastAPI Backend, and ML Model pipeline"
            className="architecture-image"
            loading="lazy"
            decoding="async"
          />
        </section>

        <section className="evaluation-section">
          <h3>📊 Model Evaluation Snapshot</h3>
          <p>Hold-out validation confusion matrix (class 0: FAKE, class 1: REAL) with tuned REAL threshold 0.40.</p>

          <div className="matrix-wrap">
            <table className="confusion-matrix">
              <caption>Confusion Matrix</caption>
              <thead>
                <tr>
                  <th scope="col">Actual \\ Predicted</th>
                  <th scope="col">FAKE</th>
                  <th scope="col">REAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">FAKE</th>
                  <td>3497</td>
                  <td>83</td>
                </tr>
                <tr>
                  <th scope="row">REAL</th>
                  <td>14</td>
                  <td>4171</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="metric-explain-grid">
            <article className="metric-explain-card">
              <h4>Validation Accuracy: 98.75%</h4>
              <p>High split accuracy with balanced behavior across both classes.</p>
            </article>
            <article className="metric-explain-card">
              <h4>Overfitting Gap: 0.30%</h4>
              <p>Train and test scores stay close, so memorization risk is low.</p>
            </article>
            <article className="metric-explain-card">
              <h4>Real-world Accuracy: 84.79%</h4>
              <p>Tuned threshold reduces label flip errors on practical short-text checks.</p>
            </article>
          </div>
        </section>

        <div className="team-section">
          <h3>👨‍💻 Developed By</h3>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.name} className={`team-card ${member.lead ? 'lead' : ''}`}>
                {member.lead && <span className="team-lead-badge">Project Lead</span>}
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
          <p className="about-love-note">Made with ❤️ by Team Fake News Detection.</p>
        </div>
      </section>
    </>
  )

  const renderSocialLinks = (className = 'home-footer-socials') => (
    <div className={className} aria-label="Social links">
      <a className="social-link social-github" href="https://github.com/ankit-xo/FakeNewsDetection" target="_blank" rel="noreferrer" aria-label="GitHub">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12.2c0 5.2 3.4 9.6 8 11.2.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.5-1.3-1.9-1.3-1.9-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6.2 0-1.4.5-2.6 1.3-3.6-.1-.3-.6-1.6.1-3.3 0 0 1.1-.4 3.7 1.3 1.1-.3 2.2-.4 3.3-.4 1.1 0 2.2.1 3.3.4 2.6-1.7 3.7-1.3 3.7-1.3.7 1.7.2 3 .1 3.3.8 1 1.3 2.2 1.3 3.6 0 4.8-2.8 5.9-5.5 6.2.4.4.8 1 .8 2.1v3c0 .3.2.7.8.6 4.6-1.6 8-6 8-11.2A11.5 11.5 0 0 0 12 .5z" />
        </svg>
      </a>
      <a className="social-link social-linkedin" href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.2 8.7H2.9V21h3.3V8.7zM4.6 7.2a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8zM21.1 14.1c0-3.7-2-5.5-4.7-5.5-2.1 0-3 .9-3.5 1.6v-1.4H9.6V21h3.3v-6.1c0-1.6.3-3.2 2.2-3.2 1.9 0 1.9 1.8 1.9 3.3V21h3.3v-6.9z" />
        </svg>
      </a>
    </div>
  )

  const renderHomeFooter = () => (
    <footer className="home-footer">
      <div className="home-footer-top">
        <div className="home-footer-links">
          <button type="button" className="home-footer-link" onClick={openLandingPage}>
            Home
          </button>
          <button type="button" className="home-footer-link" onClick={() => openAnalyzerPage('text', 'text')}>
            Text Check
          </button>
          <button type="button" className="home-footer-link" onClick={() => openAnalyzerPage('image', 'image')}>
            Image Check
          </button>
          <button
            type="button"
            className="home-footer-link"
            onClick={() => setRoute('feedback', 'feedback', mode)}
          >
            Feedback
          </button>
          <button
            type="button"
            className="home-footer-link"
            onClick={() => setRoute('about', 'about', mode)}
          >
            About Us
          </button>
        </div>

        {renderSocialLinks()}
      </div>

      <div className="home-footer-divider" />

      <div className="home-footer-bottom">
        <p className="home-footer-copy">© All rights reserved</p>

        <div className="home-footer-brand">
          <span className="footer-brand-avatar">
            <img src={logoSrc} alt="Fake News Detection logo" className="footer-brand-image" />
          </span>
          <p className="footer-brand-name">Fake News Detection</p>
        </div>

        <p className="home-footer-love">Made with ❤️ by Team Fake News Detection</p>
      </div>
    </footer>
  )

  return (
    <>
      <header className={`app-topbar ${mobileHeaderMode ? 'mobile-mode' : ''}`}>
        <div className="topbar-inner" ref={topbarInnerRef}>
          <button
            type="button"
            className="brand-wrap brand-home-btn"
            ref={brandWrapRef}
            onClick={openLandingPage}
            aria-label="Go to home"
          >
            <div className="brand-avatar">
              <picture className="brand-avatar-picture">
                <source srcSet={logoWebpSrc} type="image/webp" />
                <img
                  src={logoSrc}
                  alt="Fake News Detection logo"
                  className="brand-avatar-image"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
            </div>
            <div className="brand-text">
              <p className="brand-name">Fake News Detection</p>
            </div>
          </button>

          <button
            type="button"
            className={`mobile-menu-toggle ${mobileHeaderMode ? 'visible' : ''} ${mobileMenuOpen ? 'open' : ''}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav id="primary-navigation" className={`top-nav ${mobileMenuOpen ? 'open' : ''}`} aria-label="Primary">
            <button type="button" className={`nav-link ${activeNav === 'home' ? 'active' : ''}`} onClick={openLandingPage}>
              Home
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'text' ? 'active' : ''}`}
              onClick={() => openAnalyzerPage('text', 'text')}
            >
              Text Check
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'image' ? 'active' : ''}`}
              onClick={() => openAnalyzerPage('image', 'image')}
            >
              Image Check
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'feedback' ? 'active' : ''}`}
              onClick={() => setRouteFromMenu('feedback', 'feedback', mode)}
            >
              Feedback
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => setRouteFromMenu('about', 'about', mode)}
            >
              About Us
            </button>
          </nav>

          <div className="top-nav-measure" ref={navMeasureRef} aria-hidden="true">
            <span className="nav-link">Home</span>
            <span className="nav-link">Text Check</span>
            <span className="nav-link">Image Check</span>
            <span className="nav-link">Feedback</span>
            <span className="nav-link">About Us</span>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <div key={`${activePage}-${mode}`} className="page-view">
          {activePage === 'home' && renderHomePage()}
          {activePage === 'analyzer' && renderAnalyzerPage()}
          {activePage === 'feedback' && renderFeedbackPage()}
          {activePage === 'about' && renderAboutPage()}
        </div>

        {renderHomeFooter()}
      </main>
    </>
  )
}

export default App
