import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Certificate } from '../types';
import { CREATIVE_ORIGINS, WORK_TYPES } from '../types';
import { getAllCertificates, deleteCertificate, generateBadgeHTML } from '../lib/certificates';

export function Dashboard() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showBadge, setShowBadge] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCerts(getAllCertificates().reverse());
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this certificate? This cannot be undone.')) return;
    deleteCertificate(id);
    setCerts(prev => prev.filter(c => c.id !== id));
    if (selectedCert?.id === id) {
      setSelectedCert(null);
      setShowBadge(false);
    }
  };

  const handleCopyBadge = (cert: Certificate) => {
    const html = generateBadgeHTML(cert);
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const originClass = (id: string): string => {
    const map: Record<string, string> = {
      'fully-human': 'human',
      'human-directed': 'directed',
      'collaboration': 'collab',
      'ai-generated': 'ai',
    };
    return map[id] || '';
  };

  const totalViews = certs.reduce((sum, c) => sum + c.views, 0);
  const verifiedCount = certs.filter(c => c.verified).length;

  return (
    <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
      <div className="dash-header">
        <h1 style={{ fontSize: '2rem' }}>Dashboard</h1>
        <Link to="/register" className="btn btn-primary">New Certificate</Link>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-label">Total Certificates</div>
          <div className="dash-stat-value">{certs.length}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Verified</div>
          <div className="dash-stat-value" style={{ color: 'var(--human)' }}>{verifiedCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Total Views</div>
          <div className="dash-stat-value">{totalViews}</div>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#x1F50F;</div>
          <h3>No certificates yet</h3>
          <p>Register your first work to get a verifiable provenance certificate.</p>
          <Link to="/register" className="btn btn-primary">Register Your First Work</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCert ? '1fr 1fr' : '1fr', gap: 'var(--space-xl)' }}>
          {/* Certificate List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>
              Your Certificates ({certs.length})
            </h2>
            <div className="cert-list">
              {certs.map(cert => (
                <div
                  key={cert.id}
                  className="cert-list-item"
                  onClick={() => { setSelectedCert(cert); setShowBadge(false); }}
                  style={{
                    borderColor: selectedCert?.id === cert.id ? 'var(--gold)' : undefined,
                  }}
                >
                  <div className="cert-list-info">
                    <div className="cert-list-title">{cert.title}</div>
                    <div className="cert-list-meta">
                      <span className={`cert-origin-badge ${originClass(cert.creativeOrigin)}`} style={{ padding: '2px 10px', fontSize: '0.75rem' }}>
                        {CREATIVE_ORIGINS.find(o => o.id === cert.creativeOrigin)?.shortLabel}
                      </span>
                      <span>{WORK_TYPES.find(t => t.id === cert.workType)?.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {cert.id}
                      </span>
                    </div>
                  </div>
                  <div className="cert-list-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/certificate/${cert.id}`)}
                      title="View"
                    >
                      &#x1F441;
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(cert.id)}
                      title="Delete"
                      style={{ color: 'var(--red)' }}
                    >
                      &#x1F5D1;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Certificate Detail */}
          {selectedCert && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Certificate Detail</h2>

              <div className="cert-card">
                <div className="cert-header">
                  <div className="cert-logo">
                    <span>&#x1F50F;</span>
                    <span className="cert-logo-text">Soulprint</span>
                  </div>
                  <div className="cert-id">{selectedCert.id}</div>
                </div>

                <div className="cert-title">{selectedCert.title}</div>
                <div className="cert-creator">by {selectedCert.creatorName}</div>

                <div className="cert-details">
                  <div>
                    <div className="cert-detail-label">Type</div>
                    <div className="cert-detail-value">
                      {WORK_TYPES.find(t => t.id === selectedCert.workType)?.label}
                    </div>
                  </div>
                  <div>
                    <div className="cert-detail-label">Origin</div>
                    <div className="cert-detail-value">
                      <span className={`cert-origin-badge ${originClass(selectedCert.creativeOrigin)}`}>
                        {CREATIVE_ORIGINS.find(o => o.id === selectedCert.creativeOrigin)?.icon}{' '}
                        {CREATIVE_ORIGINS.find(o => o.id === selectedCert.creativeOrigin)?.label}
                      </span>
                    </div>
                  </div>
                  {selectedCert.culturalContext && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div className="cert-detail-label">Cultural Context</div>
                      <div className="cert-detail-value">{selectedCert.culturalContext}</div>
                    </div>
                  )}
                </div>

                <div className="cert-hash">
                  <span className="cert-hash-label">SHA-256 Certificate Hash</span>
                  {selectedCert.hash}
                </div>

                {selectedCert.fileHash && (
                  <div className="cert-hash" style={{ marginTop: 'var(--space-sm)' }}>
                    <span className="cert-hash-label">File Hash</span>
                    {selectedCert.fileHash}
                  </div>
                )}

                <div className="cert-footer">
                  <div className="cert-timestamp">
                    {new Date(selectedCert.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  <div className="cert-verified">&#x2705; Verified</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBadge(!showBadge)}
                >
                  {showBadge ? 'Hide Badge Code' : 'Get Badge Code'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/certificate/${selectedCert.id}`)}
                >
                  Full View
                </button>
              </div>

              {/* Badge Code */}
              {showBadge && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                    Copy this HTML and paste it into your website:
                  </p>
                  <div className="badge-code">{generateBadgeHTML(selectedCert)}</div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 'var(--space-sm)', position: 'relative' }}
                    onClick={() => handleCopyBadge(selectedCert)}
                  >
                    {copied ? 'Copied!' : 'Copy Badge HTML'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
