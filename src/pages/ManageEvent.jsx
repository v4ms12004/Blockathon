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

  const [confirmStep, setConfirmStep] = useState(0) // 0=idle, 1=first confirm, 2=second confirm

  async function handleEndEvent() {
    if (confirmStep === 0) {
      setConfirmStep(1)
      return
    }
    if (confirmStep === 1) {
      setConfirmStep(2)
      return
    }

    // confirmStep === 2 — actually end the event
    setEnding(true)
    setEndError(null)
    setConfirmStep(0)
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

  function printQR(url, label) {
    const printContent = `
      <html>
        <head>
          <title>BlockBadge QR — ${label}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: sans-serif;
              background: #fff;
            }
            h2 { font-size: 24px; margin-bottom: 16px; color: #000; }
            p { font-size: 12px; color: #555; margin-top: 12px; word-break: break-all; text-align: center; max-width: 300px; }
            img { width: 300px; height: 300px; }
          </style>
        </head>
        <body>
          <h2>BlockBadge — ${label}</h2>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" />
          <p>${url}</p>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 500);
            }
          <\/script>
        </body>
      </html>
    `
    const blob = new Blob([printContent], { type: 'text/html' })
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  }

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
            <p className="me-end-section-label">⚠️ Danger Zone</p>
            <p className="me-end-section-sub">
              Ending the event is permanent. Participants will be able to claim badges.
            </p>

            {confirmStep === 0 && (
              <button
                className="me-end-btn"
                onClick={handleEndEvent}
                disabled={ending}
              >
                End Event
              </button>
            )}

            {confirmStep === 1 && (
              <div className="me-confirm-box">
                <p className="me-confirm-text">
                  ⚠️ Are you sure you want to end <strong>{event.eventName}</strong>?
                </p>
                <div className="me-confirm-row">
                  <button className="me-confirm-yes" onClick={handleEndEvent}>
                    Yes, continue
                  </button>
                  <button className="me-confirm-no" onClick={() => setConfirmStep(0)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 2 && (
              <div className="me-confirm-box me-confirm-box--final">
                <p className="me-confirm-text">
                  🛑 This is your final confirmation. This action <strong>cannot be undone</strong>.
                </p>
                <div className="me-confirm-row">
                  <button className="me-confirm-final" onClick={handleEndEvent}>
                    End Event Permanently
                  </button>
                  <button className="me-confirm-no" onClick={() => setConfirmStep(0)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {ending && (
              <p className="me-status-text">⏳ Submitting to Sepolia...</p>
            )}

            {endError && <p className="me-end-error">{endError}</p>}
          </div>
        )}

        {endTxHash && (
          <div className="me-end-success">
            <p className="me-end-success-label">✅ Event Ended</p>
            <p className="me-end-success-sub">Participants can now claim their badges.</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${endTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="me-end-etherscan"
            >
              View on Etherscan ↗
            </a>
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
                <button
                  className="me-qr-print-btn"
                  onClick={() => printQR(url, `Checkpoint ${i + 1}`)}
                >
                  🖨️ Print
                </button>
              </div>
            )
          })}

          {/* Redeem QR */}
          <div className="me-qr-card me-qr-card--redeem">
            <p className="me-qr-label">🎖️ Badge Redemption</p>
            <div className="me-qr-box">
              <QRCodeSVG
                value={`${window.location.origin}/redeem/${eventId}`}
                size={160}
                bgColor="#0d1117"
                fgColor="#f59e0b"
              />
            </div>
            <p className="me-qr-url">{window.location.origin}/redeem/{eventId}</p>
            <p className="me-qr-redeem-note">
              Share after event ends — participants scan to claim their NFT badge
            </p>
            <button
              className="me-qr-print-btn me-qr-print-btn--redeem"
              onClick={() => printQR(
                `${window.location.origin}/redeem/${eventId}`,
                'Badge Redemption'
              )}
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
