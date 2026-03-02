import { Link } from 'react-router-dom';
import { CREATIVE_ORIGINS } from '../types';

export function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="fade-in">
            <div className="hero-badge">
              Fair Trade for Creative Work
            </div>
          </div>
          <h1 className="fade-in fade-in-delay-1">
            Prove Your <span className="gold">Humanity</span>.<br />
            Protect Your <span className="gold">Culture</span>.
          </h1>
          <p className="hero-sub fade-in fade-in-delay-2">
            Register your creative work with a verifiable provenance certificate.
            The first certification standard built for the AI age.
          </p>
          <div className="hero-actions fade-in fade-in-delay-3">
            <Link to="/register" className="btn btn-primary btn-lg">
              Register Your First Work
            </Link>
            <Link to="/verify" className="btn btn-secondary btn-lg">
              Verify a Certificate
            </Link>
          </div>

          <div className="hero-stats fade-in fade-in-delay-4">
            <div className="hero-stat">
              <div className="hero-stat-value">4</div>
              <div className="hero-stat-label">Origin Levels</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">SHA-256</div>
              <div className="hero-stat-label">Cryptographic Hash</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Free</div>
              <div className="hero-stat-label">For Creators</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">The Problem</p>
            <h2>In the Age of AI, How Do You Prove You're Real?</h2>
            <p>
              AI-generated content is flooding every platform. Cultural heritage is being
              scraped without consent. Creators need a way to certify their work.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#x1F30A;</div>
              <h3>The AI Slop Flood</h3>
              <p>
                Only 26% of consumers prefer AI content, down from 60%.
                Platforms are drowning in synthetic media. Human work is losing visibility.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1F6A8;</div>
              <h3>Cultural Theft at Scale</h3>
              <p>
                AI models train on cultural heritage without permission. Indigenous patterns,
                traditional music, community knowledge &mdash; extracted and commodified.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x2753;</div>
              <h3>No Simple Proof</h3>
              <p>
                C2PA is enterprise-only. "Not By AI" badges are honor system.
                NFTs collapsed. Copyright offices take months. There's no creator-friendly solution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--bg-surface-alt)' }}>
        <div className="container">
          <div className="section-header">
            <p className="section-tag">How It Works</p>
            <h2>Three Steps to Certified Work</h2>
            <p>Register in under 3 minutes. Get a verifiable certificate and embeddable badge.</p>
          </div>

          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-num">1</div>
              <h3>Describe Your Work</h3>
              <p>
                Title, type, description, and your Creative Origin &mdash;
                from fully human to AI-generated.
              </p>
            </div>
            <div className="how-step">
              <div className="how-step-num">2</div>
              <h3>Upload & Hash</h3>
              <p>
                Your file is hashed client-side using SHA-256. The file never leaves your device.
                Only the cryptographic fingerprint is stored.
              </p>
            </div>
            <div className="how-step">
              <div className="how-step-num">3</div>
              <h3>Get Your Certificate</h3>
              <p>
                Receive a unique Soulprint ID, verifiable certificate, and embeddable badge
                for your website or portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Creative Origin Spectrum */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">The Spectrum</p>
            <h2>Not Binary. A Spectrum.</h2>
            <p>
              The future isn't "AI vs Human." It's a spectrum of creative origin
              that demands transparency, not policing.
            </p>
          </div>

          <div className="origin-grid">
            {CREATIVE_ORIGINS.map(origin => (
              <div key={origin.id} className="origin-option" style={{ cursor: 'default' }}>
                <div className="origin-icon">{origin.icon}</div>
                <div className="origin-label">{origin.label}</div>
                <div className="origin-pct" style={{ color: origin.color }}>{origin.percentage}</div>
                <div className="origin-desc">{origin.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section" style={{ background: 'var(--bg-surface-alt)' }}>
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Who It's For</p>
            <h2>Every Creator. Every Medium.</h2>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#x1F3A8;</div>
              <h3>Visual Artists</h3>
              <p>
                Painters, illustrators, photographers. Prove your work is handmade.
                Authenticated art sells 40-60% higher.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1F3B5;</div>
              <h3>Musicians</h3>
              <p>
                Producers, songwriters, composers. Map to ISRC/ISWC identifiers.
                "Your ISRC is the social security number. Soulprint is the birth certificate."
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x270D;&#xFE0F;</div>
              <h3>Writers</h3>
              <p>
                Authors, journalists, poets. In an Amazon KDP flooded with AI books,
                prove your words are yours.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1F3DB;&#xFE0F;</div>
              <h3>Cultural Institutions</h3>
              <p>
                Museums, galleries, archives. Bulk register collections.
                Inter-institutional loan verification built in.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1F3E2;</div>
              <h3>Brands & Agencies</h3>
              <p>
                EU AI Act compliance by August 2026. Certify your creative supply chain.
                One brand cascades to dozens of agencies.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1F9F5;</div>
              <h3>Indigenous Creators</h3>
              <p>
                Traditional artisans, cultural practitioners. Free forever.
                Register both individual works and communal cultural practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Pricing</p>
            <h2>Free for Creators. Built for Scale.</h2>
            <p>Individual creators register free. Enterprise revenue funds the ecosystem.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-tier">Free</div>
              <div className="pricing-price">$0</div>
              <div className="pricing-desc">For individual creators</div>
              <ul className="pricing-features">
                <li>3 certificates / month</li>
                <li>SHA-256 file hashing</li>
                <li>Embeddable badge</li>
                <li>Public verification page</li>
              </ul>
              <Link to="/register" className="btn btn-secondary w-full">Get Started</Link>
            </div>

            <div className="pricing-card">
              <div className="pricing-tier">Creator Pro</div>
              <div className="pricing-price">$19<span>/mo</span></div>
              <div className="pricing-desc">For working professionals</div>
              <ul className="pricing-features">
                <li>30 certificates / month</li>
                <li>Priority verification</li>
                <li>Analytics dashboard</li>
                <li>Custom badge styling</li>
              </ul>
              <button className="btn btn-secondary w-full" onClick={() => alert('Coming soon — Stripe integration in Phase 2')}>Choose Plan</button>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-tier">Agency</div>
              <div className="pricing-price">$149<span>/mo</span></div>
              <div className="pricing-desc">EU AI Act compliance</div>
              <ul className="pricing-features">
                <li>200 certificates / month</li>
                <li>Team management</li>
                <li>Compliance dashboard</li>
                <li>API access</li>
              </ul>
              <button className="btn btn-primary w-full" onClick={() => alert('Coming soon — Stripe integration in Phase 2')}>Choose Plan</button>
            </div>

            <div className="pricing-card">
              <div className="pricing-tier">Enterprise</div>
              <div className="pricing-price">$499<span>/mo</span></div>
              <div className="pricing-desc">For institutions at scale</div>
              <ul className="pricing-features">
                <li>Unlimited certificates</li>
                <li>Bulk upload & API</li>
                <li>White-label options</li>
                <li>Custom branding</li>
              </ul>
              <button className="btn btn-secondary w-full" onClick={() => alert('Coming soon — Stripe integration in Phase 2')}>Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background: 'var(--bg-surface-alt)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 'var(--space-md)' }}>
            Ready to Certify Your Work?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto var(--space-xl)', fontSize: '1.05rem' }}>
            Join the movement. Register your first work in under 3 minutes.
            Every badge on every website is one more step toward a trusted creative ecosystem.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Register Now &mdash; It's Free
          </Link>
        </div>
      </section>
    </>
  );
}
