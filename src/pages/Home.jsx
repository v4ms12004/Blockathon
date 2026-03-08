import { useNavigate } from 'react-router-dom'
import bbadge from '../assets/bbadge.png'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      {/* Animated gradient orbs */}
      <div className="home-orb home-orb--cyan" />
      <div className="home-orb home-orb--purple" />
      <div className="home-orb home-orb--blue" />

      <div className="home-content">
        <div className="home-logo">
          <img src={bbadge} alt="BlockBadge logo" className="home-logo-img" />
        </div>
        <h1 className="home-title">BlockBadge</h1>
        <p className="home-tagline">Tamper-proof event check-ins powered by blockchain</p>
        <div className="home-divider" />

        <div className="home-buttons">
          <button className="home-btn home-btn--organizer" onClick={() => navigate('/organizer')}>
            <span className="home-btn-icon">&#128197;</span>
            <span className="home-btn-text">
              <span className="home-btn-label">I'm an Organizer</span>
              <span className="home-btn-sub">Create and manage events</span>
            </span>
            <span className="home-btn-arrow">›</span>
          </button>

          <button className="home-btn home-btn--participant" onClick={() => navigate('/participant')}>
            <span className="home-btn-icon">&#127891;</span>
            <span className="home-btn-text">
              <span className="home-btn-label">I'm a Participant</span>
              <span className="home-btn-sub">View your credentials</span>
            </span>
            <span className="home-btn-arrow">›</span>
          </button>
        </div>

        <p className="home-footer">Secured on Ethereum Sepolia</p>
      </div>
    </div>
  )
}

export default Home
