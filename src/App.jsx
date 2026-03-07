import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import Redeem from './pages/Redeem'
import Verify from './pages/Verify'
import Home from './pages/Home'
import Organizer from './pages/Organizer'
import ManageEvent from './pages/ManageEvent'
import Participant from './pages/Participant'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Organizer routes — Dev 2 will fill these */}
        <Route path="/" element={<Home />} />
        <Route path="/organizer" element={<Organizer />} />
        <Route path="/organizer/event/:eventId" element={<ManageEvent />} />

        {/* Participant routes — Dev 2 will fill these */}
        <Route path="/participant" element={<Participant />} />

        {/* Dev 1 routes — fully wired ✅ */}
        <Route path="/checkin/:eventId/:checkpointId" element={<CheckIn />} />
        <Route path="/redeem/:eventId" element={<Redeem />} />
        <Route path="/verify/:txHash" element={<Verify />} />
      </Routes>
    </BrowserRouter>
  )
}



export default App