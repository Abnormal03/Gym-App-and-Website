import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api.js'

const empty = {
  name: '', address: '', latitude: '', longitude: '',
  openingTime: '06:00', closingTime: '22:00', capacity: '',
  photos: '', amenities: '',
}

export default function GymForm({ mode }) {
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'edit') return
    let cancelled = false
    async function load() {
      try {
        const g = await api.getGym(token, id)
        if (cancelled) return
        setForm({
          name: g.name || '',
          address: g.address || '',
          latitude: g.latitude ?? '',
          longitude: g.longitude ?? '',
          openingTime: g.openingTime || '06:00',
          closingTime: g.closingTime || '22:00',
          capacity: g.capacity ?? '',
          photos: (g.photos || []).join(', '),
          amenities: (g.amenities || []).join(', '),
        })
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [mode, id, token])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const body = {
      name: form.name,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      capacity: Number(form.capacity),
      photos: form.photos.split(',').map((s) => s.trim()).filter(Boolean),
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
    }
    try {
      if (mode === 'create') {
        await api.createGym(token, body)
      } else {
        await api.updateGym(token, id, body)
      }
      navigate('/gyms')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-row">Loading gym…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{mode === 'create' ? 'Add gym' : 'Edit gym'}</h1>
          <p>Location, hours, and capacity — this is what members see when browsing.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="field full">
          <label htmlFor="name">Gym name</label>
          <input id="name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Fit Zone Gym" />
        </div>

        <div className="field full">
          <label htmlFor="address">Address</label>
          <input id="address" required value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Bole, Addis Ababa" />
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="lat">Latitude</label>
            <input id="lat" type="number" step="any" required value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="9.0054" />
          </div>
          <div className="field">
            <label htmlFor="lng">Longitude</label>
            <input id="lng" type="number" step="any" required value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="38.7636" />
          </div>
          <div className="field">
            <label htmlFor="open">Opening time</label>
            <input id="open" type="time" required value={form.openingTime} onChange={(e) => update('openingTime', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="close">Closing time</label>
            <input id="close" type="time" required value={form.closingTime} onChange={(e) => update('closingTime', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="capacity">Capacity</label>
            <input id="capacity" type="number" min="1" required value={form.capacity} onChange={(e) => update('capacity', e.target.value)} placeholder="50" />
          </div>
        </div>

        <div className="field full">
          <label htmlFor="photos">Photo URLs</label>
          <input id="photos" value={form.photos} onChange={(e) => update('photos', e.target.value)} placeholder="https://…jpg, https://…jpg" />
          <div className="field-hint">Comma-separated. Host images elsewhere first — this API takes URLs, not file uploads.</div>
        </div>

        <div className="field full">
          <label htmlFor="amenities">Amenities</label>
          <input id="amenities" value={form.amenities} onChange={(e) => update('amenities', e.target.value)} placeholder="Showers, Parking, Sauna" />
          <div className="field-hint">Comma-separated.</div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Add gym' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/gyms')}>Cancel</button>
        </div>
      </form>
    </>
  )
}
