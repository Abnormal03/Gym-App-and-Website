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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Gyms</h1>
          <p>Locations, hours, and capacity for every partner gym.</p>
        </div>
        <Link to="/gyms/new" className="btn btn-primary">Add gym</Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="loading-row">Loading gyms…</div>
        ) : gyms.length === 0 ? (
          <div className="empty-state">
            <h3>No gyms yet</h3>
            <p>Add  partner gym to start creating packages and taking bookings.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Hours</th>
                <th>Capacity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gyms.map((g) => (
                <tr key={g.id}>
                  <td><strong>{g.name}</strong></td>
                  <td>{g.address}</td>
                  <td>{g.openingTime}–{g.closingTime}</td>
                  <td>{g.capacity}</td>
                  <td>
                    <Link to={`/gyms/${g.id}/edit`} className="btn btn-ghost btn-small">Edit</Link>
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
