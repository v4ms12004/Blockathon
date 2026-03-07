import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getEventDetails, endEventOnChain } from '../utils/contract'
import { generateQRData } from '../utils/qr'
import './ManageEvent.css'

export default function ManageEvent() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true)
      const result = await getEventDetails(eventId)
      setLoading(false)
      if (!result.success) {
        setError(result.error || 'Failed to load event from chain.')
        return
      }
      setEvent(result.event)
    }
    fetchEvent()
  }, [eventId])

  async function handleEndEvent() {
    if (!window.confirm('End this event? This cannot be undone.')) return
    setEnding(true)
    setEndError('')
    const result = await endEventOnChain(eventId)
    setEnding(false)
    if (!result.success) {
      setEndError(result.error || 'Transaction failed. Please try again.')
      return
    }
    // Refresh event data to show updated status
    const refreshed = await getEventDetails(eventId)
    if (refreshed.success) setEvent(refreshed.event)
  }

  if (loading) {
    return (
      <div className="me-container">
        <div className="me-status-card">
          <div className="me-spinner">&#9203;</div>
          <p className="me-status-text">Loading event from chain...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="me-container">
        <div className="me-status-card me-status-card--error">
          <p className="me-status-text me-status-text--error">{error}</p>
          <button className="me-back-btn" onClick={() => navigate('/organizer')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const totalCheckpoints = Number(event.totalCheckpoints)

  return (
    <div className="me-layout">
      {/* ── Header ── */}
      <header className="me-header">
        <div className="me-header-left">
          <button className="me-back-btn" onClick={() => navigate('/organizer')}>
            &#8592; Dashboard
          </button>
          <div>
            <h1 className="me-title">{event.eventName}</h1>
            <p className="me-event-id">Event ID: {eventId}</p>
          </div>
        </div>

        <div className="me-header-right">
          <span className={`me-status-badge ${event.isActive ? 'me-status-badge--active' : 'me-status-badge--ended'}`}>
            {event.isActive ? 'Active' : 'Ended'}
          </span>

          {event.isActive && (
            <button
              className="me-end-btn"
              onClick={handleEndEvent}
              disabled={ending}
            >
              {ending ? 'Confirm in MetaMask...' : 'End Event'}
            </button>
          )}
        </div>
      </header>

      {endError && <p className="me-end-error">{endError}</p>}

      {/* ── Stats row ── */}
      <div className="me-stats">
        <div className="me-stat">
          <span className="me-stat-label">Participants</span>
          <span className="me-stat-value">{event.totalParticipants}</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label">Checkpoints</span>
          <span className="me-stat-value">{event.totalCheckpoints}</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label">Tokens / Check-in</span>
          <span className="me-stat-value">{event.tokensPerCheckin}</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label me-stat-label--gold">Gold</span>
          <span className="me-stat-value">{event.goldThreshold}+ tokens</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label me-stat-label--silver">Silver</span>
          <span className="me-stat-value">{event.silverThreshold}+ tokens</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label me-stat-label--bronze">Bronze</span>
          <span className="me-stat-value">{event.bronzeThreshold}+ tokens</span>
        </div>
      </div>

      {/* ── QR codes ── */}
      <section className="me-qr-section">
        <h2 className="me-qr-section-title">Check-in QR Codes</h2>
        <p className="me-qr-section-sub">
          Print or display each QR code at the corresponding checkpoint.
        </p>

        <div className="me-qr-grid">
          {Array.from({ length: totalCheckpoints }, (_, i) => {
            const cpId = `cp_${i + 1}`
            const url = generateQRData(eventId, cpId)
            return (
              <div key={cpId} className="me-qr-card">
                <p className="me-qr-label">Checkpoint {i + 1}</p>
                <div className="me-qr-box">
                  <QRCodeSVG value={url} size={180} bgColor="#0d1117" fgColor="#e2e8f0" />
                </div>
                <p className="me-qr-url">{url}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
