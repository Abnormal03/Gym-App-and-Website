import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api.js'
import { useGyms } from '../App.jsx'

const emptyForm = { name: '', type: 'monthly', price: '', durationDays: '', benefits: '' }
const TYPES = ['daily', 'weekly', 'monthly', 'annual']

export default function Packages() {
  const { token } = useAuth()
  const { gyms, selectedGym, selectedGymId, setSelectedGymId, loadingGyms } = useGyms()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null) // null = not editing, 'new' = creating
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const gymId = selectedGym?.id || selectedGymId
  const activePackages = packages.filter((pkg) => pkg.isActive !== false)
  const averagePrice = packages.length
    ? Math.round(packages.reduce((total, pkg) => total + (Number(pkg.price) || 0), 0) / packages.length)
    : 0

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await api.listPackages(token, gymId)
        if (!cancelled) setPackages(Array.isArray(data) ? data : data.packages || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, gymId])

  function startCreate() {
    setForm(emptyForm)
    setEditingId('new')
  }

  function startEdit(pkg) {
    setForm({
      name: pkg.name || '',
      type: pkg.type || 'monthly',
      price: pkg.price ?? '',
      durationDays: pkg.durationDays ?? '',
      benefits: pkg.benefits || '',
    })
    setEditingId(pkg.id)
  }

  async function refresh() {
    const data = await api.listPackages(token, gymId)
    setPackages(Array.isArray(data) ? data : data.packages || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId === 'new') {
        await api.createPackage(token, {
          gymId,
          name: form.name,
          type: form.type,
          price: Number(form.price),
          durationDays: Number(form.durationDays),
          benefits: form.benefits,
        })
      } else {
        await api.updatePackage(token, editingId, {
          name: form.name,
          type: form.type,
          price: Number(form.price),
          durationDays: Number(form.durationDays),
          benefits: form.benefits,
        })
      }
      setEditingId(null)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(pkg) {
    if (!confirm(`Deactivate "${pkg.name}"? Members will no longer be able to buy it.`)) return
    try {
      await api.deactivatePackage(token, pkg.id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleActivate(pkg) {
    if (!confirm(`Activate "${pkg.name}"?`)) return
    try {
      await api.updatePackage(token, pkg.id, { isActive: true })
      await refresh();
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="page-head package-page-head">
        <div>
          <p className="eyebrow">Membership catalogue</p>
          <h1>Packages that move people</h1>
          <p>Shape the offers members see at {selectedGym ? selectedGym.name : 'your selected gym'}.</p>
        </div>
        {gyms.length > 0 && (
          <button className="btn btn-primary package-add-button" onClick={startCreate}>
            <span className="button-plus" aria-hidden="true">+</span>
            Add package
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="package-summary" aria-label="Package summary">
        <div className="package-summary-item">
          <span className="summary-mark summary-mark-primary" aria-hidden="true">01</span>
          <div>
            <strong>{packages.length}</strong>
            <span>Total packages</span>
          </div>
        </div>
        <div className="package-summary-item">
          <span className="summary-mark" aria-hidden="true">02</span>
          <div>
            <strong>{activePackages.length}</strong>
            <span>Available to members</span>
          </div>
        </div>
        <div className="package-summary-item">
          <span className="summary-mark" aria-hidden="true">03</span>
          <div>
            <strong>{averagePrice.toLocaleString()} <small>ETB</small></strong>
            <span>Average price</span>
          </div>
        </div>
      </div>

      {editingId && (
        <form className="form-panel" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <div className="field-grid">
            <div className="field full">
              <label htmlFor="pname">Package name</label>
              <input id="pname" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Monthly Membership" />
            </div>
            <div className="field">
              <label htmlFor="ptype">Type</label>
              <select id="ptype" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pprice">Price (ETB)</label>
              <input id="pprice" type="number" min="0" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="1500" />
            </div>
            <div className="field">
              <label htmlFor="pdur">Duration (days)</label>
              <input id="pdur" type="number" min="1" required value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} placeholder="30" />
            </div>
            <div className="field full">
              <label htmlFor="pben">Benefits</label>
              <textarea id="pben" rows={2} value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} placeholder="Unlimited gym access" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId === 'new' ? 'Add package' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap package-table-wrap">
        {loadingGyms || loading ? (
          <div className="loading-row">Loading packages…</div>
        ) : !gymId ? (
          <div className="empty-state">
            <h3>No gym selected</h3>
            <p>Add a gym first, then come back to price its packages.</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <h3>No packages yet</h3>
            <p>Add a package so members can book and pay for it.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Membership</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="package-name-cell">
                      <span className="package-mark" aria-hidden="true">{(p.type || 'P').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.benefits || `${p.type || 'Membership'} access`}</span>
                      </div>
                    </div>
                  </td>
                  <td><strong className="package-price">{Number(p.price || 0).toLocaleString()} <small>ETB</small></strong></td>
                  <td><span className="package-duration">{p.durationDays || 0} <small>days</small></span></td>
                  <td>
                    <span className={`package-status ${p.isActive === false ? 'package-status-inactive' : ''}`}>
                      <span />
                      {p.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-small" onClick={() => startEdit(p)}>Edit</button>
                      {p.isActive !== false ?
                        <button className="btn btn-danger btn-small" onClick={() => handleDeactivate(p)}>Deactivate</button> : <button className="btn btn-success btn-small" onClick={() => handleActivate(p)}>Activate</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
