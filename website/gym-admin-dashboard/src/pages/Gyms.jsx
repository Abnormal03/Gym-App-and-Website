import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api.js'
import { useGyms } from '../App.jsx'

export default function Gyms() {
  const { token } = useAuth()
  const { gyms, setGyms } = useGyms()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await api.listGyms(token)
        if (!cancelled) setGyms(Array.isArray(data) ? data : data.gyms || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const totalCapacity = gyms.reduce((total, gym) => total + (Number(gym.capacity) || 0), 0)
  const averageCapacity = gyms.length ? Math.round(totalCapacity / gyms.length) : 0

  return (
    <>
      <div className="page-head gym-page-head">
        <div>
          <p className="eyebrow">Partner network</p>
          <h1>Your gym network</h1>
          <p>Keep every location ready for members, staff, and bookings.</p>
        </div>
        <Link to="/gyms/new" className="btn btn-primary gym-add-button">
          <span className="button-plus" aria-hidden="true">+</span>
          Add gym
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="gym-summary" aria-label="Gym network summary">
        <div className="gym-summary-item">
          <span className="summary-mark summary-mark-primary" aria-hidden="true">01</span>
          <div>
            <strong>{gyms.length}</strong>
            <span>Active locations</span>
          </div>
        </div>
        <div className="gym-summary-item">
          <span className="summary-mark" aria-hidden="true">02</span>
          <div>
            <strong>{totalCapacity.toLocaleString()}</strong>
            <span>Total capacity</span>
          </div>
        </div>
        <div className="gym-summary-item">
          <span className="summary-mark" aria-hidden="true">03</span>
          <div>
            <strong>{averageCapacity.toLocaleString()}</strong>
            <span>Average per location</span>
          </div>
        </div>
      </div>

      <div className="table-wrap gym-table-wrap">
        {loading ? (
          <div className="loading-row">Loading gyms…</div>
        ) : gyms.length === 0 ? (
          <div className="empty-state">
            <h3>No gyms yet</h3>
            <p>Add a partner gym to start creating packages and taking bookings.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Hours</th>
                <th>Capacity</th>
                <th>Status</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {gyms.map((g) => (
                <tr key={g.id ?? g.gymId ?? g.gym_id}>
                  <td>
                    <div className="gym-name-cell">
                      <div>
                        <strong>{g.name}</strong>
                        <span>{g.address || 'Address not provided'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="gym-hours">{g.openingTime || '--:--'} <b>to</b> {g.closingTime || '--:--'}</span>
                  </td>
                  <td>
                    <div className="capacity-cell">
                      <strong>{g.capacity || 0}</strong>
                      <span>members</span>
                    </div>
                  </td>
                  <td><span className="gym-status"><span /> Active</span></td>
                  <td>
                    <Link to={`/gyms/${g.id ?? g.gymId ?? g.gym_id}/edit`} className="btn btn-ghost btn-small gym-edit-button">View and edit <span aria-hidden="true">-&gt;</span></Link>
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
