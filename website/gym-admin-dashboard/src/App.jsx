import React, { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { api } from './api.js'
import Login from './pages/Login.jsx'
import Gyms from './pages/Gyms.jsx'
import GymForm from './pages/GymForm.jsx'
import Packages from './pages/Packages.jsx'
import Bookings from './pages/Bookings.jsx'


const GymContext = createContext(null)
export function useGyms() {
  return useContext(GymContext)
}

function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function Shell({ children }) {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [gyms, setGyms] = useState([])
  const [selectedGymId, setSelectedGymId] = useState(null)
  const [loadingGyms, setLoadingGyms] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await api.listGyms(token)
        const list = Array.isArray(data) ? data : data.gyms || []
        if (cancelled) return
        setGyms(list)
        if (list.length && !selectedGymId) setSelectedGymId(list[0].id)
      } catch (e) {
      } finally {
        if (!cancelled) setLoadingGyms(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const selectedGym = gyms.find((g) => g.id === Number(selectedGymId)) || gyms[0]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">gym<span>admin</span></div>
        <nav>
          <NavLink to="/gyms" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Gyms
          </NavLink>
          <NavLink to="/packages" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Packages
          </NavLink>
          <NavLink to="/bookings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Bookings &amp; revenue
          </NavLink>
        </nav>
        <div className="sidebar-foot">BY SKYKIN TECHNOLOGIES</div>
      </aside>

      <div className="main">
        <div className="topbar">
          {gyms.length > 0 ? (
            <select
              className="gym-switch"
              value={selectedGymId || ''}
              onChange={(e) => setSelectedGymId(Number(e.target.value))}
            >
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {loadingGyms ? 'Loading gyms…' : 'No gyms yet'}
            </span>
          )}
          <div className="topbar-user">
            <span>Admin</span>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </div>
        <div className="content">
          <GymContext.Provider value={{ gyms, setGyms, selectedGym, selectedGymId, setSelectedGymId, loadingGyms }}>
            {children}
          </GymContext.Provider>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route index element={<Navigate to="/gyms" replace />} />
                <Route path="gyms" element={<Gyms />} />
                <Route path="gyms/new" element={<GymForm mode="create" />} />
                <Route path="gyms/:id/edit" element={<GymForm mode="edit" />} />
                <Route path="packages" element={<Packages />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="*" element={<Navigate to="/gyms" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
