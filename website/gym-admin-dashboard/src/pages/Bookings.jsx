import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api.js'
import { useGyms } from '../App.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Bookings() {
  const { token } = useAuth()
  const { selectedGym, loadingGyms } = useGyms()
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const gymId = selectedGym?.id

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        api.bookingStats(token),
        gymId ? api.bookingsForGym(token, gymId) : Promise.resolve([]),
      ])
      setStats(statsRes)
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : bookingsRes.bookings || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [token, gymId])

  async function handleAction(fn, id) {
    setBusyId(id)
    setError('')
    try {
      await fn(token, id)
      await loadAll()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const totalBookings = stats?.totalBookings ?? stats?.total ?? bookings.length
  const totalRevenue = stats?.totalRevenue ?? stats?.revenue ?? '—'
  const checkIns = stats?.totalCheckIns ?? stats?.checkIns ?? bookings.filter((b) => b.status === 'checked_in').length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings &amp; revenue</h1>
          <p>{selectedGym ? selectedGym.name : 'All gyms'} — live from the booking system.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="scoreboard">
        <div className="score">
          <div className="score-value">{totalBookings}</div>
          <div className="score-label">Total bookings</div>
        </div>
        <div className="score">
          <div className="score-value">{typeof totalRevenue === 'number' ? `${totalRevenue.toLocaleString()} ETB` : totalRevenue}</div>
          <div className="score-label">Revenue</div>
        </div>
        <div className="score">
          <div className="score-value">{checkIns}</div>
          <div className="score-label">Checked in</div>
        </div>
      </div>

      <div className="table-wrap">
        {loadingGyms || loading ? (
          <div className="loading-row">Loading bookings…</div>
        ) : !gymId ? (
          <div className="empty-state">
            <h3>No gym selected</h3>
            <p>Add a gym to start seeing its bookings here.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings yet</h3>
            <p>Bookings will show up here as members reserve slots.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Slot</th>
                <th>Package</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user?.name || b.memberName || `#${b.userId ?? '—'}`}</td>
                  <td>{formatDate(b.slotStart)} – {formatDate(b.slotEnd)}</td>
                  <td>{b.package?.name || (b.packageId ? `#${b.packageId}` : '—')}</td>
                  <td>
                    <span className={`pill pill-${b.status}`}>{(b.status || 'pending').replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {b.status === 'pending' && (
                        <button
                          className="btn btn-ghost btn-small"
                          disabled={busyId === b.id}
                          onClick={() => handleAction(api.confirmBooking, b.id)}
                        >
                          Confirm
                        </button>
                      )}
                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <button
                          className="btn btn-ghost btn-small"
                          disabled={busyId === b.id}
                          onClick={() => handleAction(api.checkInBooking, b.id)}
                        >
                          Check in
                        </button>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'checked_in' && (
                        <button
                          className="btn btn-danger btn-small"
                          disabled={busyId === b.id}
                          onClick={() => handleAction(api.cancelBooking, b.id)}
                        >
                          Cancel
                        </button>
                      )}
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
