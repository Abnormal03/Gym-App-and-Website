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
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length
  const revenueLabel = typeof totalRevenue === 'number' ? `${totalRevenue.toLocaleString()} ETB` : totalRevenue

  return (
    <>
      <div className="page-head booking-page-head">
        <div>
          <p className="eyebrow">Daily operations</p>
          <h1>Booking pulse</h1>
          <p>{selectedGym ? selectedGym.name : 'All gyms'} — reservations, attendance, and revenue in one view.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="booking-summary" aria-label="Booking summary">
        <div className="booking-summary-item">
          <span className="summary-mark summary-mark-primary" aria-hidden="true">01</span>
          <div>
            <strong>{totalBookings}</strong>
            <span>Total bookings</span>
          </div>
        </div>
        <div className="booking-summary-item">
          <span className="summary-mark" aria-hidden="true">02</span>
          <div>
            <strong>{revenueLabel}</strong>
            <span>Revenue collected</span>
          </div>
        </div>
        <div className="booking-summary-item">
          <span className="summary-mark" aria-hidden="true">03</span>
          <div>
            <strong>{checkIns}</strong>
            <span>Checked in</span>
          </div>
        </div>
      </div>

      <div className="booking-list-heading">
        <div>
          <h2>Reservation queue</h2>
          <p>{pendingBookings} {pendingBookings === 1 ? 'booking' : 'bookings'} waiting for confirmation.</p>
        </div>
        <span className="booking-live-indicator"><span /> Live data</span>
      </div>

      <div className="table-wrap booking-table-wrap">
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
                <th>Reservation slot</th>
                <th>Package</th>
                <th>Status</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="booking-member-cell">
                      <span className="booking-member-mark" aria-hidden="true">{(b.user?.name || b.memberName || 'M').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{b.user?.name || b.memberName || `#${b.userId ?? '—'}`}</strong>
                        <span>Member booking</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="booking-slot-cell">
                      <strong>{formatDate(b.slotStart)}</strong>
                      <span>Ends {formatDate(b.slotEnd)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="booking-package-cell">{b.package?.name || (b.packageId ? `Package #${b.packageId}` : 'Package not listed')}</span>
                  </td>
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
