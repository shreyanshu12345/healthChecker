import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import History from './pages/History'
import Metrics from './pages/Metrics'
import './App.css'

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/metrics" element={<Metrics />} />
      </Routes>
    </>
  )
}
