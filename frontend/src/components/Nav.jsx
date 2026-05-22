import { NavLink } from 'react-router-dom'
import './Nav.css'

export default function Nav() {
  return (
    <nav className="nav">
      <span className="nav-brand">URL Health Monitor</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Checker
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          History
        </NavLink>
        <NavLink to="/metrics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Metrics
        </NavLink>
      </div>
    </nav>
  )
}
