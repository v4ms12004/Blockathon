import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createEventOnChain } from '../utils/contract'
import { generateQRData } from '../utils/qr'
import './Organizer.css'

function calcThresholds(totalCheckpoints, tokensPerCheckin) {
  return {
    goldThreshold:   totalCheckpoints * tokensPerCheckin,
    silverThreshold: Math.floor(totalCheckpoints * 0.66) * tokensPerCheckin,
    bronzeThreshold: Math.floor(totalCheckpoints * 0.33) * tokensPerCheckin,
  }
}

const defaultForm = {
  name: '',
  totalParticipants: 50,
  totalCheckpoints: 3,
  tokensPerCheckin: 10,
}

export default function Organizer() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | deploying | success | error
  const [deployedEvent, setDeployedEvent] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Event name is required'
    if (!form.totalParticipants || form.totalParticipants < 1)
      e.totalParticipants = 'Must be at least 1'
    if (!form.totalCheckpoints || form.totalCheckpoints < 1)
      e.totalCheckpoints = 'Must be at least 1'
    if (form.tokensPerCheckin < 1) e.tokensPerCheckin = 'Must be at least 1'
    return e
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: name === 'name' ? value : Number(value) }))
    setErrors(err => ({ ...err, [name]: undefined }))
  }

  async function handleDeploy() {
    if (!window.ethereum) {
      setErrorMsg('MetaMask is not installed. Please install MetaMask.')
      setStatus('error')
      return
    }

    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    const thresholds = calcThresholds(
      Number(form.totalCheckpoints),
      Number(form.tokensPerCheckin)
    )

    setStatus('deploying')
    setErrorMsg('')

    const result = await createEventOnChain({
      eventName: form.name,
      totalParticipants: Number(form.totalParticipants),
      totalCheckpoints: Number(form.totalCheckpoints),
      tokensPerCheckin: Number(form.tokensPerCheckin),
      goldThreshold: thresholds.goldThreshold,
      silverThreshold: thresholds.silverThreshold,
      bronzeThreshold: thresholds.bronzeThreshold,
    })

    if (!result.success) {
      setErrorMsg(result.error || 'Deployment failed. Please try again.')
      setStatus('error')
      return
    }

    setDeployedEvent({
      eventId: result.eventId,
      txHash: result.txHash,
      name: form.name,
      totalCheckpoints: Number(form.totalCheckpoints),
      tokensPerCheckin: Number(form.tokensPerCheckin),
      ...thresholds,
    })
    setStatus('success')
  }

  const thresholdPreview = calcThresholds(
    Number(form.totalCheckpoints) || 0,
    Number(form.tokensPerCheckin) || 0
  )

  return (
    <div className="org-layout">
      {/* ── Left panel: form ── */}
      <aside className="org-sidebar">
        <h1 className="org-sidebar-title">Organizer Dashboard</h1>
        <p className="org-sidebar-sub">Deploy a new event to Ethereum Sepolia.</p>

        {/* MetaMask warning */}
        {!window.ethereum && (
          <div className="org-metamask-warning">
            ⚠️ MetaMask not detected. Please install MetaMask to deploy events.
          </div>
        )}

        <div className="org-form">
          <div className="org-field">
            <label className="org-label">Event Name</label>
            <input
              className={`org-input${errors.name ? ' org-input--error' : ''}`}
              name="name"
              type="text"
              placeholder="e.g. Block-a-Thon KU 2026"
              value={form.name}
              onChange={handleChange}
              disabled={status === 'deploying'}
            />
            {errors.name && <span className="org-error">{errors.name}</span>}
          </div>

          <div className="org-row">
            <div className="org-field">
              <label className="org-label">Total Participants</label>
              <input
                className={`org-input${errors.totalParticipants ? ' org-input--error' : ''}`}
                name="totalParticipants"
                type="number"
                min="1"
                value={form.totalParticipants}
                onChange={handleChange}
                disabled={status === 'deploying'}
              />
              {errors.totalParticipants && <span className="org-error">{errors.totalParticipants}</span>}
            </div>

            <div className="org-field">
              <label className="org-label">Total Checkpoints</label>
              <input
                className={`org-input${errors.totalCheckpoints ? ' org-input--error' : ''}`}
                name="totalCheckpoints"
                type="number"
                min="1"
                value={form.totalCheckpoints}
                onChange={handleChange}
                disabled={status === 'deploying'}
              />
              {errors.totalCheckpoints && <span className="org-error">{errors.totalCheckpoints}</span>}
            </div>
          </div>

          <div className="org-field">
            <label className="org-label">Tokens per Check-in</label>
            <input
              className={`org-input${errors.tokensPerCheckin ? ' org-input--error' : ''}`}
              name="tokensPerCheckin"
              type="number"
              min="1"
              value={form.tokensPerCheckin}
              onChange={handleChange}
              disabled={status === 'deploying'}
            />
            {errors.tokensPerCheckin && <span className="org-error">{errors.tokensPerCheckin}</span>}
          </div>

          {form.totalCheckpoints >= 1 && form.tokensPerCheckin >= 1 && (
            <div className="org-threshold-preview">
              <p className="org-threshold-preview-label">Auto-calculated badge thresholds</p>
              <div className="org-threshold-preview-row">
                <span className="org-badge org-badge--gold">🥇 Gold: {thresholdPreview.goldThreshold}+ tokens</span>
                <span className="org-badge org-badge--silver">🥈 Silver: {thresholdPreview.silverThreshold}+ tokens</span>
                <span className="org-badge org-badge--bronze">🥉 Bronze: {thresholdPreview.bronzeThreshold}+ tokens</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="org-error-box">⚠️ {errorMsg}</div>
          )}

          <button
            className="org-submit-btn"
            onClick={handleDeploy}
            disabled={status === 'deploying'}
          >
            {status === 'deploying' ? '⏳ Deploying to Sepolia...' : '🚀 Deploy Event to Blockchain'}
          </button>
        </div>
      </aside>

      {/* ── Right panel: QR codes ── */}
      <main className="org-main">
        {status === 'idle' && (
          <div className="org-empty">
            <div className="org-empty-icon">📋</div>
            <p className="org-empty-text">Fill in the form and deploy your event to generate check-in QR codes.</p>
          </div>
        )}

        {status === 'deploying' && (
          <div className="org-empty">
            <div className="org-empty-icon">⛓️</div>
            <p className="org-empty-text">Deploying to Ethereum Sepolia...</p>
            <p className="org-empty-subtext">Please approve the transaction in MetaMask</p>
          </div>
        )}

        {status === 'error' && (
          <div className="org-empty">
            <div className="org-empty-icon">❌</div>
            <p className="org-empty-text">Deployment failed</p>
            <p className="org-empty-subtext">{errorMsg}</p>
            <button className="org-submit-btn" onClick={() => setStatus('idle')}>
              Try Again
            </button>
          </div>
        )}

        {status === 'success' && deployedEvent && (
          <div className="org-detail">
            {/* Success header */}
            <div className="org-detail-header">
              <div>
                <div className="org-success-badge">✅ Event Deployed Successfully</div>
                <h2 className="org-detail-title">{deployedEvent.name}</h2>
                <p className="org-detail-meta">
                  Event ID: <strong>#{deployedEvent.eventId}</strong> &middot;{' '}
                  {deployedEvent.totalCheckpoints} checkpoints &middot;{' '}
                  {deployedEvent.tokensPerCheckin} tokens / check-in
                </p>
                <div className="org-badges-row">
                  <span className="org-badge org-badge--gold">🥇 Gold: {deployedEvent.goldThreshold}+</span>
                  <span className="org-badge org-badge--silver">🥈 Silver: {deployedEvent.silverThreshold}+</span>
                  <span className="org-badge org-badge--bronze">🥉 Bronze: {deployedEvent.bronzeThreshold}+</span>
                </div>
                <a
                  className="org-etherscan-link"
                  href={`https://sepolia.etherscan.io/tx/${deployedEvent.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Etherscan ↗
                </a>
              </div>
              <button
                className="org-manage-btn"
                onClick={() => navigate(`/organizer/event/${deployedEvent.eventId}`)}
              >
                Manage Event →
              </button>
            </div>

            {/* QR codes */}
            <h3 className="org-qr-section-title">Checkpoint QR Codes</h3>
            <p className="org-qr-section-sub">Print or display these at each checkpoint station</p>
            <div className="org-qr-grid">
              {Array.from({ length: deployedEvent.totalCheckpoints }, (_, i) => {
                const url = generateQRData(deployedEvent.eventId, i)
                return (
                  <div key={i} className="org-qr-card">
                    <p className="org-qr-label">Checkpoint {i + 1}</p>
                    <div className="org-qr-box">
                      <QRCodeSVG
                        value={url}
                        size={160}
                        bgColor="#0d1117"
                        fgColor="#e2e8f0"
                        id={`qr-checkpoint-${i}`}
                      />
                    </div>
                    <p className="org-qr-url">{url}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}