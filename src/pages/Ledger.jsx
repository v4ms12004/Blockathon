import { useEffect, useState, useCallback } from 'react'
import { getLedgerStats } from '../utils/xrpl'
import { getActiveEventId, clearCachedEventId } from '../utils/activeEvent'
import { getEventDetails } from '../utils/contract'
import './Ledger.css'

export default function Ledger() {
  const [status, setStatus] = useState('loading')
  const [stats, setStats] = useState(null)
  const [eventName, setEventName] = useState('')
  const [eventId, setEventId] = useState(null)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')
      clearCachedEventId()
      const id = await getActiveEventId()
      setEventId(id)

      const eventResult = await getEventDetails(id)
      if (eventResult.success) {
        setEventName(eventResult.event.eventName)
      }

      const result = await getLedgerStats(id)
      if (!result.success) throw new Error(result.error)

      setStats(result.stats)
      setStatus('loaded')
    } catch (err) {
      setError(err.message || 'Failed to load ledger stats')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (status === 'loading') {
    return (
      <div className="ledger-center">
        <div className="ledger-spinner" />
        <p className="ledger-loading-text">Reading XRPL transactions...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ledger-center">
        <div className="ledger-error-icon">⚠️</div>
        <p className="ledger-error-text">{error}</p>
        <button className="ledger-retry-btn" onClick={fetchStats}>
          Retry
        </button>
      </div>
    )
  }

  const checkpoints = Object.entries(stats.checkpointBreakdown).sort()

  return (
    <div className="ledger-page">
      <div className="ledger-header">
        <div className="ledger-xrpl-badge">⚡ XRPL Testnet</div>
        <h2 className="ledger-title">Transaction Ledger</h2>
        <p className="ledger-subtitle">
          {eventName} — Event #{eventId}
        </p>
      </div>

      <div className="ledger-stats-grid">
        <div className="ledger-stat-card">
          <p className="ledger-stat-label">Total Tokens Distributed</p>
          <p className="ledger-stat-value ledger-stat-value--cyan">
            {stats.totalTokensDistributed}
          </p>
          <p className="ledger-stat-unit">BLK</p>
        </div>

        <div className="ledger-stat-card">
          <p className="ledger-stat-label">Unique Participants</p>
          <p className="ledger-stat-value ledger-stat-value--green">
            {stats.uniqueParticipants}
          </p>
          <p className="ledger-stat-unit">wallets</p>
        </div>

        <div className="ledger-stat-card">
          <p className="ledger-stat-label">Total Transactions</p>
          <p className="ledger-stat-value ledger-stat-value--purple">
            {stats.totalTransactions}
          </p>
          <p className="ledger-stat-unit">on XRPL</p>
        </div>

        <div className="ledger-stat-card">
          <p className="ledger-stat-label">Organizer BLK Balance</p>
          <p className="ledger-stat-value ledger-stat-value--gold">
            {parseFloat(stats.organizerBalance).toFixed(2)}
          </p>
          <p className="ledger-stat-unit">BLK remaining</p>
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
                  <span className="ledger-checkpoint-count">
                    {data.count} check-ins
                  </span>
                </div>
                <div className="ledger-checkpoint-bar-track">
                  <div
                    className="ledger-checkpoint-bar-fill"
                    style={{
                      width: `${Math.min(100, (data.count / Math.max(...checkpoints.map(([, d]) => d.count))) * 100)}%`
                    }}
                  />
                </div>
                <span className="ledger-checkpoint-tokens">
                  {data.tokens} BLK
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="ledger-refresh-btn" onClick={fetchStats}>
        ↻ Refresh
      </button>
    </div>
  )
}