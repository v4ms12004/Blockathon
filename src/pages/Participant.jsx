import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEventDetails, getParticipantDetails } from '../utils/contract'
import './Participant.css'

export default function Participant() {
  const navigate = useNavigate()
  const eventId = import.meta.env.VITE_ACTIVE_EVENT_ID

  const [status, setStatus] = useState('disconnected') // disconnected | loading | loaded | error
  const [address, setAddress] = useState(null)
  const [event, setEvent] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [error, setError] = useState(null)

  // Check if already connected on mount
  useEffect(() => {
    async function checkConnected() {
      if (!window.ethereum) return
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setStatus('loading')
          await loadData(accounts[0])
        }
      } catch {}
    }
    checkConnected()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setStatus('disconnected')
        setAddress(null)
        setEvent(null)
        setParticipant(null)
      } else {
        setAddress(accounts[0])
        setStatus('loading')
        loadData(accounts[0])
      }
    }
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
  }, [])

  async function connectWallet() {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it to continue.')
      setStatus('error')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const addr = accounts[0]
      setAddress(addr)
      setStatus('loading')
      await loadData(addr)
    } catch (err) {
      setError(err.message || 'Failed to connect wallet.')
      setStatus('error')
    }
  }

  async function loadData(addr) {
    try {
      setError(null)
      const eventResult = await getEventDetails(eventId)
      if (!eventResult.success) throw new Error(eventResult.error || 'Failed to load event')

      const pResult = await getParticipantDetails(eventId, addr)
      if (!pResult.success) throw new Error(pResult.error || 'Failed to load participant data')

      setEvent(eventResult.event)
      setParticipant(pResult.participant)
      setStatus('loaded')
    } catch (err) {
      setError(err.message || 'Something went wrong loading your data.')
      setStatus('error')
    }
  }

  function truncateAddress(addr) {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function getBadgeEligibility(balance, event) {
    if (!event) return null
    if (balance >= event.goldThreshold) return 'gold'
    if (balance >= event.silverThreshold) return 'silver'
    if (balance >= event.bronzeThreshold) return 'bronze'
    return null
  }

  function getTierIcon(tier) {
    if (tier === 'gold') return '🥇'
    if (tier === 'silver') return '🥈'
    if (tier === 'bronze') return '🥉'
    return null
  }

  function getProgressPercent(checkinCount, totalCheckpoints) {
    if (!totalCheckpoints) return 0
    return Math.min(100, Math.round((checkinCount / totalCheckpoints) * 100))
  }

  // ── Render: No MetaMask ──────────────────────────────────────
  if (status === 'error' && !window.ethereum) {
    return (
      <div className="participant-page">
        <div className="participant-container">
          <div className="participant-header">
            <div className="participant-logo">BlockBadge</div>
            <h1 className="participant-title">My Dashboard</h1>
          </div>
          <div className="metamask-warning">
            <div className="metamask-warning-icon">⚠️</div>
            <h2 className="metamask-warning-title">MetaMask Required</h2>
            <p className="metamask-warning-text">
              Please install MetaMask to use BlockBadge on your mobile device.
            </p>
            <a
              className="metamask-install-btn"
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
            >
              Install MetaMask
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Disconnected ─────────────────────────────────────
  if (status === 'disconnected') {
    return (
      <div className="participant-page">
        <div className="participant-container">
          <div className="participant-header">
            <div className="participant-logo">BlockBadge</div>
            <h1 className="participant-title">My Dashboard</h1>
            <p className="participant-subtitle">Connect your wallet to view your progress</p>
          </div>

          <div className="connect-card">
            <div className="connect-card-icon">🎫</div>
            <h2 className="connect-card-title">Welcome, Participant</h2>
            <p className="connect-card-text">
              Connect your MetaMask wallet to see your token balance, check-in progress, and badge eligibility.
            </p>
            <button className="connect-btn" onClick={connectWallet}>
              <span className="connect-btn-icon">🦊</span>
              Connect MetaMask
            </button>
          </div>

          <div className="participant-steps">
            <div className="step-item">
              <div className="step-num">1</div>
              <span>Scan QR codes at checkpoints</span>
            </div>
            <div className="step-divider" />
            <div className="step-item">
              <div className="step-num">2</div>
              <span>Earn BLKPT tokens</span>
            </div>
            <div className="step-divider" />
            <div className="step-item">
              <div className="step-num">3</div>
              <span>Claim your NFT badge</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Loading ──────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="participant-page">
        <div className="participant-container">
          <div className="participant-header">
            <div className="participant-logo">BlockBadge</div>
            <h1 className="participant-title">My Dashboard</h1>
          </div>
          <div className="loading-card">
            <div className="spinner" />
            <p className="loading-text">Loading your progress from the blockchain...</p>
            <p className="loading-subtext">{truncateAddress(address)}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Error ────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="participant-page">
        <div className="participant-container">
          <div className="participant-header">
            <div className="participant-logo">BlockBadge</div>
            <h1 className="participant-title">My Dashboard</h1>
          </div>
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={() => { setStatus('disconnected'); setError(null) }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Loaded ───────────────────────────────────────────
  const { tokenBalance, checkinCount, hasClaimedBadge, badgeTier, nftTokenId } = participant
  const { eventName, goldThreshold, silverThreshold, bronzeThreshold, isActive, totalCheckpoints } = event
  const eligibleTier = getBadgeEligibility(tokenBalance, event)
  const progressPercent = getProgressPercent(checkinCount, totalCheckpoints)

  return (
    <div className="participant-page">
      <div className="participant-container">

        {/* Header */}
        <div className="participant-header">
          <div className="participant-logo">BlockBadge</div>
          <h1 className="participant-title">My Dashboard</h1>
          <div className="wallet-pill">
            <span className="wallet-dot" />
            {truncateAddress(address)}
          </div>
        </div>

        {/* Event Name */}
        <div className="event-name-bar">
          <span className="event-name-label">Event</span>
          <span className="event-name-value">{eventName}</span>
          <span className={`event-status-pill ${isActive ? 'active' : 'ended'}`}>
            {isActive ? '🟢 Active' : '🔴 Ended'}
          </span>
        </div>

        {/* Token Balance — hero stat */}
        <div className="balance-card">
          <p className="balance-label">Token Balance</p>
          <div className="balance-number">{tokenBalance}</div>
          <p className="balance-unit">BLKPT</p>
        </div>

        {/* Check-in Progress */}
        <div className="checkin-card">
          <div className="checkin-header">
            <span className="checkin-title">Check-in Progress</span>
            <span className="checkin-count">{checkinCount} / {totalCheckpoints} checkpoints</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="progress-percent">{progressPercent}% complete</p>
        </div>

        {/* Badge Tier Eligibility */}
        <div className="badge-section">
          <h2 className="badge-section-title">Badge Eligibility</h2>

          <div className="tier-list">
            <div className={`tier-item ${tokenBalance >= goldThreshold ? 'tier-achieved' : 'tier-locked'}`}>
              <span className="tier-icon">🥇</span>
              <div className="tier-info">
                <span className="tier-name">Gold</span>
                <span className="tier-req">{goldThreshold} BLKPT required</span>
              </div>
              {tokenBalance >= goldThreshold
                ? <span className="tier-badge-check">✓</span>
                : <span className="tier-needed">{goldThreshold - tokenBalance} more</span>
              }
            </div>

            <div className={`tier-item ${tokenBalance >= silverThreshold ? 'tier-achieved' : 'tier-locked'}`}>
              <span className="tier-icon">🥈</span>
              <div className="tier-info">
                <span className="tier-name">Silver</span>
                <span className="tier-req">{silverThreshold} BLKPT required</span>
              </div>
              {tokenBalance >= silverThreshold
                ? <span className="tier-badge-check">✓</span>
                : <span className="tier-needed">{silverThreshold - tokenBalance} more</span>
              }
            </div>

            <div className={`tier-item ${tokenBalance >= bronzeThreshold ? 'tier-achieved' : 'tier-locked'}`}>
              <span className="tier-icon">🥉</span>
              <div className="tier-info">
                <span className="tier-name">Bronze</span>
                <span className="tier-req">{bronzeThreshold} BLKPT required</span>
              </div>
              {tokenBalance >= bronzeThreshold
                ? <span className="tier-badge-check">✓</span>
                : <span className="tier-needed">{bronzeThreshold - tokenBalance} more</span>
              }
            </div>
          </div>

          {/* No eligibility message */}
          {!eligibleTier && (
            <div className="no-eligibility-msg">
              <p>Keep scanning QR codes to earn tokens 📲</p>
            </div>
          )}
        </div>

        {/* Action Area */}
        {hasClaimedBadge ? (
          /* Already claimed — show view badge */
          <div className="action-card claimed">
            <div className="claimed-icon">{getTierIcon(badgeTier)}</div>
            <h3 className="claimed-title">Badge Claimed!</h3>
            <p className="claimed-tier">
              You hold a <strong>{badgeTier}</strong> badge
            </p>
            <button
              className="view-badge-btn"
              onClick={() => navigate(`/verify/${nftTokenId}`)}
            >
              View My Badge
            </button>
          </div>
        ) : !isActive && eligibleTier ? (
          /* Event ended + eligible — claim badge */
          <div className="action-card eligible">
            <div className="eligible-icon">{getTierIcon(eligibleTier)}</div>
            <h3 className="eligible-title">You're eligible for a {eligibleTier} badge!</h3>
            <p className="eligible-text">The event has ended. Claim your NFT badge now.</p>
            <button
              className="claim-btn"
              onClick={() => navigate(`/redeem/${eventId}`)}
            >
              Claim Badge →
            </button>
          </div>
        ) : isActive && eligibleTier ? (
          /* Event still active — eligible but wait */
          <div className="action-card pending">
            <div className="pending-icon">{getTierIcon(eligibleTier)}</div>
            <h3 className="pending-title">
              {eligibleTier.charAt(0).toUpperCase() + eligibleTier.slice(1)} eligible!
            </h3>
            <p className="pending-text">
              The event is still active. Badge claiming opens when the organizer ends the event.
            </p>
          </div>
        ) : null}

        {/* Refresh button */}
        <button className="refresh-btn" onClick={() => loadData(address)}>
          ↻ Refresh
        </button>

      </div>
    </div>
  )
}