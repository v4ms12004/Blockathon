import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getEventDetails, endEventOnChain } from '../utils/contract'
import { generateQRData } from '../utils/qr'
import './ManageEvent.css'

export default function ManageEvent() {
  const { eventId } = useParams()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [ending, setEnding] = useState(false)
  const [endTxHash, setEndTxHash] = useState(null)
  const [endError, setEndError] = useState(null)

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true)
      setFetchError(null)
      const result = await getEventDetails(eventId)
      if (result.success) {
        setEvent(result.event)
      } else {
        setFetchError(result.error || 'Failed to load event from chain.')
      }
      setLoading(false)
    }
    fetchEvent()
  }, [eventId])

  async function handleEndEvent() {
    setEnding(true)
    setEndError(null)
    const result = await endEventOnChain(eventId)
    if (result.success) {
      setEndTxHash(result.txHash)
      setEvent(prev => ({ ...prev, isActive: false }))
    } else {
      setEndError(result.error || 'Failed to end event.')
    }
    setEnding(false)
  }

  if (loading) {
    return (
      <div className="me-center">
        <div className="me-spinner" />
        <p className="me-status-text">Loading event from chain…</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="me-center">
        <p className="me-error-text">{fetchError}</p>
      </div>
    )
  }

  const totalCheckpoints = Number(event.totalCheckpoints)

  return (
    <div className="me-layout">
      {/* ── Left sidebar: event info ── */}
      <aside className="me-sidebar">
        <p className="me-event-id">Event #{eventId}</p>
        <h1 className="me-event-name">{event.eventName}</h1>

        <div className="me-status-row">
          <span className={`me-status-badge ${event.isActive ? 'me-status-badge--active' : 'me-status-badge--ended'}`}>
            {event.isActive ? 'Active' : 'Ended'}
          </span>
        </div>

        <div className="me-info-grid">
          <div className="me-info-item">
            <span className="me-info-label">Participants</span>
            <span className="me-info-value">{event.totalParticipants}</span>
          </div>
          <div className="me-info-item">
            <span className="me-info-label">Checkpoints</span>
            <span className="me-info-value">{event.totalCheckpoints}</span>
          </div>
          <div className="me-info-item">
            <span className="me-info-label">Tokens / Check-in</span>
            <span className="me-info-value">{event.tokensPerCheckin}</span>
          </div>
          <div className="me-info-item">
            <span className="me-info-label">Organizer</span>
            <span className="me-info-value me-info-value--mono">
              {event.organizer.slice(0, 6)}…{event.organizer.slice(-4)}
            </span>
          </div>
        </div>

        <div className="me-thresholds">
          <p className="me-thresholds-label">Badge Thresholds</p>
          <div className="me-badges-row">
            <span className="me-badge me-badge--gold">Gold: {event.goldThreshold}+ tokens</span>
            <span className="me-badge me-badge--silver">Silver: {event.silverThreshold}+ tokens</span>
            <span className="me-badge me-badge--bronze">Bronze: {event.bronzeThreshold}+ tokens</span>
          </div>
        </div>

        {event.isActive && (
          <div className="me-end-section">
            <button
              className="me-end-btn"
              onClick={handleEndEvent}
              disabled={ending}
            >
              {ending ? 'Ending Event…' : 'End Event'}
            </button>
            {endError && <p className="me-end-error">{endError}</p>}
          </div>
        )}

        {endTxHash && (
          <div className="me-end-success">
            <p className="me-end-success-label">Event ended</p>
            <p className="me-end-success-hash">{endTxHash}</p>
          </div>
        )}
      </aside>

      {/* ── Right panel: QR codes ── */}
      <main className="me-main">
        <h2 className="me-qr-heading">Check-in QR Codes</h2>
        <div className="me-qr-grid">
          {Array.from({ length: totalCheckpoints }, (_, i) => {
            const url = generateQRData(eventId, i)
            return (
              <div key={i} className="me-qr-card">
                <p className="me-qr-label">Checkpoint {i + 1}</p>
                <div className="me-qr-box">
                  <QRCodeSVG value={url} size={160} bgColor="#0d1117" fgColor="#e2e8f0" />
                </div>
                <p className="me-qr-url">{url}</p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
