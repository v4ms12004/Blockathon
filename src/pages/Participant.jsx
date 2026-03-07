import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getParticipantDetails, getEventDetails } from '../utils/contract'
import './Participant.css'

function getBadgeTier(balance, event) {
  const bal = parseInt(balance)
  if (bal >= parseInt(event.goldThreshold))   return 'gold'
  if (bal >= parseInt(event.silverThreshold)) return 'silver'
  if (bal >= parseInt(event.bronzeThreshold)) return 'bronze'
  return null
}

const TIER_META = {
  gold:   { label: 'Gold',   emoji: '\uD83E\uDD47', color: '#f59e0b' },
  silver: { label: 'Silver', emoji: '\uD83E\uDD48', color: '#94a3b8' },
  bronze: { label: 'Bronze', emoji: '\uD83E\uDD49', color: '#b45309' },
}

export default function Participant() {
  const navigate = useNavigate()

  const [eventIdInput, setEventIdInput] = useState('')
  const [step, setStep] = useState('input') // input | loading | result | error
  const [errorMsg, setErrorMsg] = useState('')

  const [event, setEvent] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [tier, setTier] = useState(null)
  const [resolvedEventId, setResolvedEventId] = useState('')

  async function handleLookup(e) {
    e.preventDefault()
    const eventId = eventIdInput.trim()
    if (!eventId) return

    setStep('loading')
    setErrorMsg('')

    try {
      if (!window.ethereum) {
        setStep('error')
        setErrorMsg('MetaMask not found. Please install MetaMask to continue.')
        return
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]

      const [eventResult, pResult] = await Promise.all([
        getEventDetails(eventId),
        getParticipantDetails(eventId, address),
      ])

      if (!eventResult.success) {
        setStep('error')
        setErrorMsg(eventResult.error || 'Event not found on chain. Check the Event ID.')
        return
      }

      if (!pResult.success) {
        setStep('error')
        setErrorMsg(pResult.error || 'Could not fetch your participation data.')
        return
      }

      const ev = eventResult.event
      const p  = pResult.participant

      setEvent(ev)
      setParticipant(p)
      setTier(getBadgeTier(p.tokenBalance, ev))
      setResolvedEventId(eventId)
      setStep('result')
    } catch (err) {
      setStep('error')
      setErrorMsg(err.message || 'Something went wrong.')
    }
  }

  function handleReset() {
    setStep('input')
    setErrorMsg('')
    setEvent(null)
    setParticipant(null)
    setTier(null)
  }

  return (
    <div className="pt-container">
      {/* ── Step 1: Enter event ID ── */}
      {step === 'input' && (
        <div className="pt-card">
          <div className="pt-icon">&#127891;</div>
          <h1 className="pt-card-title">Check Your Status</h1>
          <p className="pt-card-sub">Enter your Event ID to see your token balance and badge eligibility.</p>

          <form className="pt-form" onSubmit={handleLookup}>
            <label className="pt-label">Event ID</label>
            <input
              className="pt-input"
              type="text"
              placeholder="e.g. 1"
              value={eventIdInput}
              onChange={e => setEventIdInput(e.target.value)}
              autoFocus
            />
            <button className="pt-btn pt-btn--primary" type="submit">
              Connect &amp; Look Up
            </button>
          </form>
        </div>
      )}

      {/* ── Loading ── */}
      {step === 'loading' && (
        <div className="pt-card">
          <div className="pt-spinner">&#9203;</div>
          <h2 className="pt-card-title">Fetching your data...</h2>
          <p className="pt-card-sub">Connecting to MetaMask and reading from chain.</p>
        </div>
      )}

      {/* ── Error ── */}
      {step === 'error' && (
        <div className="pt-card pt-card--error">
          <div className="pt-icon">&#10060;</div>
          <h2 className="pt-card-title pt-card-title--error">Something went wrong</h2>
          <p className="pt-card-sub">{errorMsg}</p>
          <button className="pt-btn pt-btn--ghost" onClick={handleReset}>
            Try Again
          </button>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && event && participant && (
        <div className="pt-card pt-card--result">
          <h2 className="pt-event-name">{event.eventName}</h2>

          <div className="pt-stats">
            <div className="pt-stat">
              <span className="pt-stat-label">Token Balance</span>
              <span className="pt-stat-value pt-stat-value--accent">{participant.tokenBalance} BLKPT</span>
            </div>
            <div className="pt-stat">
              <span className="pt-stat-label">Checkpoints Attended</span>
              <span className="pt-stat-value">{participant.checkinCount} / {event.totalCheckpoints}</span>
            </div>
          </div>

          {/* Badge eligibility */}
          <div className="pt-tier-section">
            {tier ? (
              <>
                <p className="pt-tier-label">You are eligible for</p>
                <div className="pt-tier-badge" style={{ borderColor: TIER_META[tier].color }}>
                  <span className="pt-tier-emoji">{TIER_META[tier].emoji}</span>
                  <span className="pt-tier-name" style={{ color: TIER_META[tier].color }}>
                    {TIER_META[tier].label} Badge
                  </span>
                </div>
              </>
            ) : (
              <div className="pt-tier-badge pt-tier-badge--none">
                <span className="pt-tier-emoji">&#128308;</span>
                <span className="pt-tier-name pt-tier-name--none">Not yet eligible</span>
                <span className="pt-tier-sub">
                  Need {event.bronzeThreshold} tokens for Bronze. Keep checking in!
                </span>
              </div>
            )}
          </div>

          {/* Threshold reference */}
          <div className="pt-thresholds">
            <div className="pt-threshold pt-threshold--gold">
              <span>Gold</span><span>{event.goldThreshold}+ tokens</span>
            </div>
            <div className="pt-threshold pt-threshold--silver">
              <span>Silver</span><span>{event.silverThreshold}+ tokens</span>
            </div>
            <div className="pt-threshold pt-threshold--bronze">
              <span>Bronze</span><span>{event.bronzeThreshold}+ tokens</span>
            </div>
          </div>

          {/* Claim badge — only if event ended and participant is eligible */}
          {!event.isActive && tier && !participant.hasClaimedBadge && (
            <button
              className="pt-btn pt-btn--primary pt-btn--claim"
              onClick={() => navigate(`/redeem/${resolvedEventId}`)}
            >
              Claim {TIER_META[tier].label} Badge
            </button>
          )}

          {!event.isActive && participant.hasClaimedBadge && (
            <p className="pt-claimed-note">Badge already claimed.</p>
          )}

          {event.isActive && (
            <p className="pt-active-note">Event is still active — check back once the organizer ends it to claim your badge.</p>
          )}

          <button className="pt-btn pt-btn--ghost" onClick={handleReset}>
            Look up another event
          </button>
        </div>
      )}
    </div>
  )
}
