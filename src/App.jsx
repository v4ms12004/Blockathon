import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import Redeem from './pages/Redeem'
import Verify from './pages/Verify'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Organizer routes — Dev 2 will fill these */}
        <Route path="/" element={<h1 style={styles.placeholder}>🏠 Home — Dev 2</h1>} />
        <Route path="/organizer" element={<h1 style={styles.placeholder}>🏫 Organizer Dashboard — Dev 2</h1>} />
        <Route path="/organizer/event/:eventId" element={<h1 style={styles.placeholder}>📋 Manage Event — Dev 2</h1>} />

        {/* Participant routes — Dev 2 will fill these */}
        <Route path="/participant" element={<h1 style={styles.placeholder}>🎓 Participant View — Dev 2</h1>} />

        {/* Dev 1 routes — fully wired ✅ */}
        <Route path="/checkin/:eventId/:checkpointId" element={<CheckIn />} />
        <Route path="/redeem/:eventId" element={<Redeem />} />
        <Route path="/verify/:txHash" element={<Verify />} />
      </Routes>
    </BrowserRouter>
  )
}

const styles = {
  placeholder: {
    color: '#64748b',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: '40vh',
  }
}

export default App