import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getEventDetails, endEventOnChain } from '../utils/contract'
import { getLedgerStats } from '../utils/xrpl'
import { generateQRData } from '../utils/qr'
import './ManageEvent.css'
import './Ledger.css'

export default function ManageEvent() {
  const { eventId } = useParams()
  const [activeTab, setActiveTab] = useState('dashboard')

  // ── Event state ──
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // ── End event state ──
  const [ending, setEnding] = useState(false)
  const [endTxHash, setEndTxHash] = useState(null)
  const [endError, setEndError] = useState(null)
  const [confirmStep, setConfirmStep] = useState(0)

  // ── Ledger state ──
  const [ledgerStatus, setLedgerStatus] = useState('loading')
  const [ledgerStats, setLedgerStats] = useState(null)
  const [ledgerError, setLedgerError] = useState('')

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

  const fetchLedger = useCallback(async () => {
    try {
      setLedgerStatus('loading')
      setLedgerError('')
      const result = await getLedgerStats(eventId)
      if (!result.success) throw new Error(result.error)
      setLedgerStats(result.stats)
      setLedgerStatus('loaded')
    } catch (err) {
      setLedgerError(err.message || 'Failed to load ledger stats')
      setLedgerStatus('error')
    }
  }, [eventId])

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger()
  }, [activeTab, fetchLedger])

  async function handleEndEvent() {
    if (confirmStep === 0) { setConfirmStep(1); return }
    if (confirmStep === 1) { setConfirmStep(2); return }
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

  function printQR(url, label) {
    const printContent = `
      <html>
        <head>
          <title>BlockBadge QR — ${label}</title>
          <style>
            body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; font-family:sans-serif; background:#fff; }
            h2 { font-size:24px; margin-bottom:16px; color:#000; }
            p { font-size:12px; color:#555; margin-top:12px; word-break:break-all; text-align:center; max-width:300px; }
            img { width:300px; height:300px; }
          </style>
        </head>
        <body>
          <h2>BlockBadge — ${label}</h2>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" />
          <p>${url}</p>
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }<\/script>
        </body>
      </html>
    `
    const blob = new Blob([printContent], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
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
  const checkpoints = ledgerStats ? Object.entries(ledgerStats.checkpointBreakdown).sort() : []

  return (
    <div className="me-page">
      {/* ── Tab bar ── */}
      <div className="me-tabs">
        <button
          className={`me-tab ${activeTab === 'dashboard' ? 'me-tab--active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📋 Dashboard
        </button>
        <button
          className={`me-tab ${activeTab === 'ledger' ? 'me-tab--active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          ⚡ XRPL Ledger
        </button>
      </div>

      {/* ── Dashboard Tab ── */}
      {activeTab === 'dashboard' && (
        <div className="me-layout">
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
                  <button className="me-end-btn" onClick={handleEndEvent} disabled={ending}>
                    End Event
                  </button>
                )}
                {confirmStep === 1 && (
                  <div className="me-confirm-box">
                    <p className="me-confirm-text">
                      ⚠️ Are you sure you want to end <strong>{event.eventName}</strong>?
                    </p>
                    <div className="me-confirm-row">
                      <button className="me-confirm-yes" onClick={handleEndEvent}>Yes, continue</button>
                      <button className="me-confirm-no" onClick={() => setConfirmStep(0)}>Cancel</button>
                    </div>
                  </div>
                )}
                {confirmStep === 2 && (
                  <div className="me-confirm-box me-confirm-box--final">
                    <p className="me-confirm-text">
                      🛑 This is your final confirmation. This action <strong>cannot be undone</strong>.
                    </p>
                    <div className="me-confirm-row">
                      <button className="me-confirm-final" onClick={handleEndEvent}>End Event Permanently</button>
                      <button className="me-confirm-no" onClick={() => setConfirmStep(0)}>Cancel</button>
                    </div>
                  </div>
                )}
                {ending && <p className="me-status-text">⏳ Submitting to Sepolia...</p>}
                {endError && <p className="me-end-error">{endError}</p>}
              </div>
            )}

            {endTxHash && (
              <div className="me-end-success">
                <p className="me-end-success-label">✅ Event Ended</p>
                <p className="me-end-success-sub">Participants can now claim their badges.</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${endTxHash}`}
                  target="_blank" rel="noreferrer"
                  className="me-end-etherscan"
                >
                  View on Etherscan ↗
                </a>
              </div>
            )}
          </aside>

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
                    <button className="me-qr-print-btn" onClick={() => printQR(url, `Checkpoint ${i + 1}`)}>
                      🖨️ Print
                    </button>
                  </div>
                )
              })}

              <div className="me-qr-card me-qr-card--redeem">
                <p className="me-qr-label">🎖️ Badge Redemption</p>
                <div className="me-qr-box">
                  <QRCodeSVG
                    value={`${window.location.origin}/redeem/${eventId}`}
                    size={160} bgColor="#0d1117" fgColor="#f59e0b"
                  />
                </div>
                <p className="me-qr-url">{window.location.origin}/redeem/{eventId}</p>
                <p className="me-qr-redeem-note">Share after event ends — participants scan to claim their NFT badge</p>
                <button
                  className="me-qr-print-btn me-qr-print-btn--redeem"
                  onClick={() => printQR(`${window.location.origin}/redeem/${eventId}`, 'Badge Redemption')}
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ── Ledger Tab ── */}
      {activeTab === 'ledger' && (
        <div className="ledger-page">
          {ledgerStatus === 'loading' && (
            <div className="ledger-center">
              <div className="ledger-spinner" />
              <p className="ledger-loading-text">Reading XRPL transactions...</p>
            </div>
          )}

          {ledgerStatus === 'error' && (
            <div className="ledger-center">
              <div className="ledger-error-icon">⚠️</div>
              <p className="ledger-error-text">{ledgerError}</p>
              <button className="ledger-retry-btn" onClick={fetchLedger}>Retry</button>
            </div>
          )}

          {ledgerStatus === 'loaded' && ledgerStats && (
            <>
              <div className="ledger-header">
                <div className="ledger-xrpl-badge">⚡ XRPL Testnet</div>
                <h2 className="ledger-title">Transaction Ledger</h2>
                <p className="ledger-subtitle">{event.eventName} — Event #{eventId}</p>
              </div>

              <div className="ledger-stats-grid">
                <div className="ledger-stat-card">
                  <p className="ledger-stat-label">Total Tokens Distributed</p>
                  <p className="ledger-stat-value ledger-stat-value--cyan">{ledgerStats.totalTokensDistributed}</p>
                  <p className="ledger-stat-unit">BLK</p>
                </div>
                <div className="ledger-stat-card">
                  <p className="ledger-stat-label">Unique Participants</p>
                  <p className="ledger-stat-value ledger-stat-value--green">{ledgerStats.uniqueParticipants}</p>
                  <p className="ledger-stat-unit">wallets</p>
                </div>
                <div className="ledger-stat-card">
                  <p className="ledger-stat-label">Total Transactions</p>
                  <p className="ledger-stat-value ledger-stat-value--purple">{ledgerStats.totalTransactions}</p>
                  <p className="ledger-stat-unit">on XRPL</p>
                </div>
                <div className="ledger-stat-card">
                  <p className="ledger-stat-label">Tokens per Participant</p>
                  <p className="ledger-stat-value ledger-stat-value--gold">
                    {ledgerStats.uniqueParticipants > 0
                      ? (ledgerStats.totalTokensDistributed / ledgerStats.uniqueParticipants).toFixed(0)
                      : 0}
                  </p>
                  <p className="ledger-stat-unit">BLK avg</p>
                </div>
              </div>

              <div className="ledger-section">
                <h3 className="ledger-section-title">Per Checkpoint Breakdown</h3>
                {checkpoints.length === 0 ? (
                  <p className="ledger-empty">No check-ins recorded on XRPL yet.</p>
                ) : (
                  <div className="ledger-checkpoint-list">
                    {checkpoints.map(([cpId, data]) => (
                      <div key={cpId} className="ledger-checkpoint-row">
                        <div className="ledger-checkpoint-info">
                          <span className="ledger-checkpoint-name">
                            {cpId.startsWith('checkpoint-')
                              ? `Checkpoint ${parseInt(cpId.replace('checkpoint-', '')) + 1}`
                              : cpId}
                          </span>
                          <span className="ledger-checkpoint-count">{data.count} check-ins</span>
                        </div>
                        <div className="ledger-checkpoint-bar-track">
                          <div
                            className="ledger-checkpoint-bar-fill"
                            style={{
                              width: `${Math.min(100, (data.count / Math.max(...checkpoints.map(([, d]) => d.count))) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="ledger-checkpoint-tokens">{data.tokens} BLK</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="ledger-refresh-btn" onClick={fetchLedger}>↻ Refresh</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}