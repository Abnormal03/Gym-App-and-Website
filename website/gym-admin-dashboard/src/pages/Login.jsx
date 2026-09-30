import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (token) return <Navigate to="/gyms" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/gyms')
    } catch (err) {
      setError(err.message || 'Could not log in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand-panel">
        <div className="login-brand">gym<span>admin</span></div>
        <div className="login-brand-copy">
          <p className="eyebrow">Operations, in focus</p>
          <h1>A clearer view of your gym business.</h1>
          <p>Keep your locations, packages, and bookings moving from one focused workspace.</p>
        </div>
        <div className="login-brand-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>Admin workspace</span>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-heading">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to continue</h2>
          <p className="sub">Use your admin account to access the dashboard.</p>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="login-submit" type="submit" disabled={submitting}>
            <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
            <span aria-hidden="true">-&gt;</span>
          </button>
        </form>

        <p className="login-note">Authorized gym administrators only.</p>
      </div>
    </div>
  )
}
