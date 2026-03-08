import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEventOnChain } from '../utils/contract'
import './Organizer.css'

function calcThresholds(totalCheckpoints, tokensPerCheckin) {
  return {
    goldThreshold:   totalCheckpoints * tokensPerCheckin,
    silverThreshold: Math.max(2, Math.floor(totalCheckpoints * 0.66)) * tokensPerCheckin,
    bronzeThreshold: Math.max(1, Math.floor(totalCheckpoints * 0.33)) * tokensPerCheckin,
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
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Event name is required'
    if (!form.totalParticipants || form.totalParticipants < 1) e.totalParticipants = 'Must be at least 1'
    if (!form.totalCheckpoints || form.totalCheckpoints < 1) e.totalCheckpoints = 'Must be at least 1'
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
    if (Object.keys(errs).length) { setErrors(errs); return }

    const thresholds = calcThresholds(Number(form.totalCheckpoints), Number(form.tokensPerCheckin))
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

    // Auto-navigate to manage event page
    navigate(`/organizer/event/${result.eventId}`)
  }

  const thresholdPreview = calcThresholds(
    Number(form.totalCheckpoints) || 0,
    Number(form.tokensPerCheckin) || 0
  )

  return (
    <div className="org-layout">
      <aside className="org-sidebar">
        <h1 className="org-sidebar-title">Organizer Dashboard</h1>
        <p className="org-sidebar-sub">Deploy a new event to Ethereum Sepolia.</p>

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
              name="name" type="text"
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
                name="totalParticipants" type="number" min="1"
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
                name="totalCheckpoints" type="number" min="1"
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
              name="tokensPerCheckin" type="number" min="1"
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

          {status === 'error' && <div className="org-error-box">⚠️ {errorMsg}</div>}

          <button
            className="org-submit-btn"
            onClick={handleDeploy}
            disabled={status === 'deploying'}
          >
            {status === 'deploying' ? '⏳ Deploying to Sepolia...' : '🚀 Deploy Event to Blockchain'}
          </button>
        </div>
      </aside>

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
            <button className="org-submit-btn" onClick={() => setStatus('idle')}>Try Again</button>
          </div>
        )}
      </main>
    </div>
  )
}