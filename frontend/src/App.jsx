import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://fake-news-detection-api.onrender.com'
).replace(/\/$/, '')

const endpoint = (path) => `${API_BASE}${path}`

const TEAM_MEMBERS = [
  { name: 'Ankit Anand', role: 'Frontend Developer' },
  { name: 'Anubhav Gangwar', role: 'Backend Developer' },
  { name: 'Manjeet Kumar', role: 'AI & Testing Engineer' },
]

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
  const initialRoute = readRouteFromPath()
  const [mode, setMode] = useState(initialRoute.mode)
  const [activeNav, setActiveNav] = useState(initialRoute.activeNav)
  const [activePage, setActivePage] = useState(initialRoute.activePage)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const fileInputRef = useRef(null)

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

  const confidence = useMemo(() => {
    if (typeof result?.prob !== 'number') return null
    return (result.prob * 100).toFixed(2)
  }, [result])

  const textStats = useMemo(() => {
    const trimmed = text.trim()
    return {
      chars: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
    }
  }, [text])

  const handleTextSubmit = async (event) => {
    event.preventDefault()

    if (!text.trim()) {
      setResult(emptyResult('Please enter news text.'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(endpoint('/api/predict'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()
      setResult(data)
      setFeedback('')
      if (!response.ok) {
        setError(data.note || 'Prediction failed.')
      }
    } catch {
      setError('Unable to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageSubmit = async (event) => {
    event.preventDefault()

    if (!imageFile) {
      setResult(emptyResult('Please upload an image first.'))
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('image', imageFile)

    try {
      const response = await fetch(endpoint('/api/predict-image'), {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setResult(data)
      setFeedback('')
      if (data.input_text) {
        setText(data.input_text)
      }

      if (!response.ok) {
        setError(data.note || 'Image prediction failed.')
      }
    } catch {
      setError('Unable to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  const setImageFromFile = (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setError('')
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

  const handleFeedback = async (type) => {
    const feedbackText = result?.input_text || text

    if (!feedbackText?.trim()) {
      setError('No prediction available for feedback.')
      return
    }

    try {
      const response = await fetch(endpoint('/api/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: type,
          text: feedbackText,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'Feedback failed.')
        return
      }

      setFeedback(type)
      setError('')
    } catch {
      setError('Unable to submit feedback.')
    }
  }

  const setRoute = (nextPage, nextNav, nextMode = mode) => {
    setActivePage(nextPage)
    setActiveNav(nextNav)
    setMode(nextMode)
  }

  const openLandingPage = () => {
    setRoute('home', 'home', mode)
  }

  const openAnalyzerPage = (nextMode = 'text', navTab = 'text') => {
    setRoute('analyzer', navTab, nextMode)
  }

  const handleClear = () => {
    setText('')
    clearImage()
    setResult(null)
    setFeedback('')
    setError('')
    openAnalyzerPage('text', 'text')
  }

  const showResult = Boolean(result?.result || result?.note)

  const renderHomePage = () => (
    <>
      <section className="work-hero home-hero">
        <div className="work-pill home-pill">Home</div>
        <div className="hero-content">
          <h1>Detect misleading news before it spreads</h1>
          <p className="hero-text">
            Check text and image based news with confidence score, fake indicators, and practical verification tips.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-btn page-btn hero-btn" onClick={() => openAnalyzerPage('text', 'text')}>
              Start News Check
            </button>
          </div>

          <div className="hero-highlights" aria-label="Platform highlights">
            <span className="hero-chip">Text + Image Analysis</span>
            <span className="hero-chip">Confidence Score</span>
            <span className="hero-chip">Reason + Tips</span>
          </div>

          <div className="hero-stats" aria-label="Quick stats">
            <article className="hero-stat">
              <strong>2</strong>
              <span>Check Modes</span>
            </article>
            <article className="hero-stat">
              <strong>Instant</strong>
              <span>Prediction Flow</span>
            </article>
            <article className="hero-stat">
              <strong>Actionable</strong>
              <span>Trust Tips</span>
            </article>
          </div>
        </div>
      </section>

      <section className="info-card home-info-card">
        <div className="page-intro">
          <h2>How This Platform Helps</h2>
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
          <h3>Quick Start in 3 Steps</h3>
          <div className="steps-grid">
            <article className="step-card">
              <span className="step-count">01</span>
              <h4>Choose Mode</h4>
              <p>Select Text Check or Image Check based on the content you want to verify.</p>
            </article>
            <article className="step-card">
              <span className="step-count">02</span>
              <h4>Run Prediction</h4>
              <p>Submit your input and get model output with confidence in a few seconds.</p>
            </article>
            <article className="step-card">
              <span className="step-count">03</span>
              <h4>Review Tips</h4>
              <p>Read reasons and verification tips before you trust or share that news.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  )

  const renderAnalyzerPage = () => (
    <>
      <section className="work-hero" id="hero-section">
        <div className="work-pill">{mode === 'text' ? 'Text Check' : 'Image Check'}</div>
      </section>

      <section className="work-card" id="analyze-section">
        <div className="card-intro">
          <h2>Analyze News Content</h2>
          <p className="card-subtext">
            {mode === 'text'
              ? 'Paste news text below and get prediction, confidence, and reliability indicators.'
              : 'Upload an image of news content and let the model evaluate whether it looks reliable.'}
          </p>
        </div>

        <div className="analysis-badges" aria-label="Analyzer highlights">
          <span className="analysis-badge">Fast Prediction</span>
          <span className="analysis-badge">Model Confidence</span>
          <span className="analysis-badge">Clear Reasons</span>
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

            <button type="submit" className="primary-btn predict-btn" disabled={loading}>
              {loading ? 'Predicting...' : 'Predict'}
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

            <button type="submit" className="primary-btn predict-btn" disabled={loading}>
              {loading ? 'Reading Image...' : 'Predict'}
            </button>
          </form>
        )}

        {error && <p className="error-banner">{error}</p>}

        {showResult && (
          <section className="result-card">
            {result?.result && (
              <>
                <div className={`result-chip ${result.result === 'REAL' ? 'real' : 'fake'}`}>{result.result}</div>

                {confidence && (
                  <>
                    <div className="progress-wrap">
                      <div className="progress-fill" style={{ width: `${confidence}%` }} />
                    </div>
                    <p className="confidence-text">The news is {confidence}% real</p>
                  </>
                )}

                {result.result === 'FAKE' && (
                  <article className="reason-box">
                    <h3>Why this news is likely fake ⚠️</h3>

                    {Array.isArray(result.fake_reasons_list) && result.fake_reasons_list.length > 0 ? (
                      <ul className="reason-list">
                        {result.fake_reasons_list.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{result.fake_reasons}</p>
                    )}

                    {Array.isArray(result.verification_tips) && result.verification_tips.length > 0 && (
                      <div className="tips-box">
                        <h4>Quick verification tips</h4>
                        <ul className="tips-list">
                          {result.verification_tips.map((tip, index) => (
                            <li key={`${tip}-${index}`}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                )}

                <div className="feedback-row">
                  <span>Feedback ✍️:</span>
                  <button
                    type="button"
                    className={`feedback-btn ${feedback === 'real' ? 'selected' : ''}`}
                    onClick={() => handleFeedback('real')}
                  >
                    Real
                  </button>
                  <button
                    type="button"
                    className={`feedback-btn ${feedback === 'fake' ? 'selected' : ''}`}
                    onClick={() => handleFeedback('fake')}
                  >
                    Fake
                  </button>
                </div>
              </>
            )}

            {result?.note && <p className="note-banner">{result.note}</p>}
          </section>
        )}

        <div className="footer-row">
          <button type="button" className="secondary-btn" onClick={handleClear}>
            Clear
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
          <h2>Help Us Improve Fake News Detection</h2>
          <p>
            Your feedback helps us improve model quality, user experience, and overall accuracy for both text and image
            checks.
          </p>
        </div>

        <div className="page-chip-row" aria-label="Feedback scope">
          <span className="page-chip">Accuracy Review</span>
          <span className="page-chip">UI Experience</span>
          <span className="page-chip">Feature Suggestions</span>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>Model Accuracy</h3>
            <p>Report cases where the prediction looked incorrect so we can improve training quality.</p>
          </article>
          <article className="feature-card">
            <h3>User Experience</h3>
            <p>Share if anything feels confusing, slow, or difficult while using text check or image check.</p>
          </article>
          <article className="feature-card">
            <h3>Feature Request</h3>
            <p>Suggest improvements like new checks, better explanations, or workflow enhancements.</p>
          </article>
        </div>

        <div className="about-panel">
          <h3>How to Submit Useful Feedback ✨</h3>
          <ul className="team-list">
            <li>Run a prediction from the Text Check or Image Check page.</li>
            <li>Use Real or Fake feedback buttons after result.</li>
            <li>Mention what looked wrong and why.</li>
          </ul>
        </div>

        <div className="about-layout feedback-layout">
          <article className="about-panel">
            <h3>What Happens After Feedback</h3>
            <p>
              Useful reports are reviewed and grouped into model improvement tasks, UI fixes, and quality checks for
              upcoming updates.
            </p>
          </article>
          <article className="about-panel">
            <h3>Best Way to Help</h3>
            <ul className="team-list">
              <li>Share the exact text or screenshot that was checked.</li>
              <li>Mention if prediction was false positive or false negative.</li>
              <li>Add one short reason so the case can be verified quickly.</li>
            </ul>
          </article>
        </div>

        <div className="cta-row">
          <button
            type="button"
            className="primary-btn page-btn"
            onClick={() => openAnalyzerPage(mode === 'image' ? 'image' : 'text', mode === 'image' ? 'image' : 'text')}
          >
            Go to Analyzer
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

        <div className="team-section">
          <h3>👥 Team Members</h3>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.name} className="team-card">
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
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

        <div className="home-footer-socials" aria-label="Social links">
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
      </div>

      <div className="home-footer-divider" />

      <div className="home-footer-bottom">
        <p className="home-footer-copy">© All rights reserved</p>

        <div className="home-footer-brand">
          <span className="footer-brand-avatar">FN</span>
          <p className="footer-brand-name">Fake News Detection</p>
        </div>

        <span className="home-footer-end" aria-hidden="true" />
      </div>
    </footer>
  )

  return (
    <>
      <header className="app-topbar">
        <div className="brand-wrap">
          <div className="brand-avatar">FN</div>
          <div className="brand-text">
            <p className="brand-name">Fake News Detection</p>
          </div>
        </div>

        <nav className="top-nav" aria-label="Primary">
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
            onClick={() => setRoute('feedback', 'feedback', mode)}
          >
            Feedback
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
            onClick={() => setRoute('about', 'about', mode)}
          >
            About Us
          </button>
        </nav>
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
