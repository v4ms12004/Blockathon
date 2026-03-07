import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { generateQRData } from '../utils/qr'
import { createEventOnChain } from '../utils/contract'
import './Organizer.css'

const STORAGE_KEY = 'blockbadge_events'

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function calcThresholds(totalCheckpoints, tokensPerCheckin) {
  return {
    goldThreshold:   totalCheckpoints * tokensPerCheckin,
    silverThreshold: Math.floor(totalCheckpoints * 0.66) * tokensPerCheckin,
    bronzeThreshold: Math.floor(totalCheckpoints * 0.33) * tokensPerCheckin,
  }
}

const defaultForm = {
  name: '',
  totalParticipants: '',
  totalCheckpoints: '',
  tokensPerCheckin: 10,
}

export default function Organizer() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [events, setEvents] = useState(loadEvents)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  }, [events])

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

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const thresholds = calcThresholds(form.totalCheckpoints, form.tokensPerCheckin)

    const result = await createEventOnChain({
      eventName: form.name,
      totalParticipants: form.totalParticipants,
      totalCheckpoints: form.totalCheckpoints,
      tokensPerCheckin: form.tokensPerCheckin,
      ...thresholds,
    })

    setSubmitting(false)

    if (!result.success) {
      setSubmitError(result.error || 'Transaction failed. Please try again.')
      return
    }

    const newEvent = {
      id: result.eventId,
      ...form,
      ...thresholds,
      txHash: result.txHash,
      createdAt: Date.now(),
    }

    setEvents(prev => [newEvent, ...prev])
    setForm(defaultForm)
    setErrors({})
    navigate(`/organizer/event/${result.eventId}`)
  }

  function handleDelete(eventId) {
    setEvents(prev => prev.filter(ev => ev.id !== eventId))
    if (selectedEvent?.id === eventId) setSelectedEvent(null)
  }

  return (
    <div className="org-layout">
      {/* ── Left panel: form ── */}
      <aside className="org-sidebar">
        <h1 className="org-sidebar-title">Organizer Dashboard</h1>
        <p className="org-sidebar-sub">Create a new event to generate check-in QR codes.</p>

        <form className="org-form" onSubmit={handleSubmit} noValidate>
          <div className="org-field">
            <label className="org-label">Event Name</label>
            <input
              className={`org-input${errors.name ? ' org-input--error' : ''}`}
              name="name"
              type="text"
              placeholder="e.g. Blockathon 2026"
              value={form.name}
              onChange={handleChange}
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
                placeholder="100"
                value={form.totalParticipants}
                onChange={handleChange}
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
                placeholder="5"
                value={form.totalCheckpoints}
                onChange={handleChange}
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
            />
            {errors.tokensPerCheckin && <span className="org-error">{errors.tokensPerCheckin}</span>}
          </div>

          {form.totalCheckpoints >= 1 && form.tokensPerCheckin >= 1 && (() => {
            const t = calcThresholds(Number(form.totalCheckpoints), Number(form.tokensPerCheckin))
            return (
              <div className="org-threshold-preview">
                <p className="org-threshold-preview-label">Auto-calculated badge thresholds</p>
                <div className="org-threshold-preview-row">
                  <span className="org-badge org-badge--gold">Gold: {t.goldThreshold}+ tokens</span>
                  <span className="org-badge org-badge--silver">Silver: {t.silverThreshold}+ tokens</span>
                  <span className="org-badge org-badge--bronze">Bronze: {t.bronzeThreshold}+ tokens</span>
                </div>
              </div>
            )
          })()}

          {submitError && (
            <p className="org-submit-error">{submitError}</p>
          )}

          <button className="org-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Confirm in MetaMask...' : 'Create Event'}
          </button>
        </form>

        {/* Event list */}
        {events.length > 0 && (
          <div className="org-event-list">
            <h3 className="org-event-list-title">Your Events</h3>
            {events.map(ev => (
              <div
                key={ev.id}
                className={`org-event-item${selectedEvent?.id === ev.id ? ' org-event-item--active' : ''}`}
                onClick={() => setSelectedEvent(ev)}
              >
                <span className="org-event-item-name">{ev.name}</span>
                <span className="org-event-item-meta">{ev.totalCheckpoints} checkpoints</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Right panel: QR codes ── */}
      <main className="org-main">
        {!selectedEvent ? (
          <div className="org-empty">
            <div className="org-empty-icon">&#128197;</div>
            <p className="org-empty-text">Create an event to see its check-in QR codes here.</p>
          </div>
        ) : (
          <div className="org-detail">
            <div className="org-detail-header">
              <div>
                <h2 className="org-detail-title">{selectedEvent.name}</h2>
                <p className="org-detail-meta">
                  {selectedEvent.totalParticipants} participants &middot;{' '}
                  {selectedEvent.totalCheckpoints} checkpoints &middot;{' '}
                  {selectedEvent.tokensPerCheckin} tokens / check-in
                </p>
                <div className="org-badges-row">
                  <span className="org-badge org-badge--gold">Gold: {selectedEvent.goldThreshold}+</span>
                  <span className="org-badge org-badge--silver">Silver: {selectedEvent.silverThreshold}+</span>
                  <span className="org-badge org-badge--bronze">Bronze: {selectedEvent.bronzeThreshold}+</span>
                </div>
              </div>
              <button
                className="org-delete-btn"
                onClick={() => handleDelete(selectedEvent.id)}
              >
                Delete Event
              </button>
            </div>

            <div className="org-qr-grid">
              {Array.from({ length: selectedEvent.totalCheckpoints }, (_, i) => {
                const cpId = `cp_${i + 1}`
                const url = generateQRData(selectedEvent.id, cpId)
                return (
                  <div key={cpId} className="org-qr-card">
                    <p className="org-qr-label">Checkpoint {i + 1}</p>
                    <div className="org-qr-box">
                      <QRCodeSVG value={url} size={160} bgColor="#0d1117" fgColor="#e2e8f0" />
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
