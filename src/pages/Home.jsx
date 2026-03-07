import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-logo">&#9632;</div>
        <h1 className="home-title">BlockAttend</h1>
        <p className="home-tagline">Tamper-proof event check-ins powered by blockchain</p>

        <div className="home-buttons">
          <button className="home-btn home-btn--organizer" onClick={() => navigate('/organizer')}>
            <span className="home-btn-icon">&#128197;</span>
            <span className="home-btn-label">I'm an Organizer</span>
            <span className="home-btn-sub">Create and manage events</span>
          </button>

          <button className="home-btn home-btn--participant" onClick={() => navigate('/participant')}>
            <span className="home-btn-icon">&#127891;</span>
            <span className="home-btn-label">I'm a Participant</span>
            <span className="home-btn-sub">View your credentials</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
