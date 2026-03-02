import { useState, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

function Stars() {
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
    })), []);

  return (
    <div className="stars-container">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.duration}s ${s.delay}s infinite`,
            ['--max-opacity' as string]: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <>
      <Stars />
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">&#x1F50F;</span>
            <span className="nav-logo-text">Soulprint</span>
          </Link>

          <button
            className="nav-mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '\u2715' : '\u2630'}
          </button>

          <div className={`nav-links${menuOpen ? ' open' : ''}`}>
            <Link to="/" className={isActive('/')}>Home</Link>
            <Link to="/lab" className={isActive('/lab')}>Forensic Lab</Link>
            <Link to="/verify" className={isActive('/verify')}>Verify</Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            <Link to="/register" className="nav-cta">Register Work</Link>
          </div>
        </div>
      </nav>

      <div className="page-content">
        <Outlet />
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-links">
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/register" className="footer-link">Register</Link>
            <Link to="/verify" className="footer-link">Verify</Link>
            <Link to="/dashboard" className="footer-link">Dashboard</Link>
          </div>
          <p className="footer-copy">
            Soulprint &mdash; Fair Trade for Creative Work. Built by SodaLabs.
          </p>
        </div>
      </footer>
    </>
  );
}
