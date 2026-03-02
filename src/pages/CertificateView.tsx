import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Certificate } from '../types';
import { CREATIVE_ORIGINS, WORK_TYPES } from '../types';
import { getCertificate, generateBadgeHTML } from '../lib/certificates';

export function CertificateView() {
  const { id } = useParams<{ id: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [showBadge, setShowBadge] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      const found = getCertificate(id);
      setCert(found || null);
    }
  }, [id]);

  const handleCopyBadge = () => {
    if (!cert) return;
    navigator.clipboard.writeText(generateBadgeHTML(cert));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const originClass = (oid: string): string => {
    const map: Record<string, string> = {
      'fully-human': 'human',
      'human-directed': 'directed',
      'collaboration': 'collab',
      'ai-generated': 'ai',
    };
    return map[oid] || '';
  };

  if (!cert) {
    return (
      <div className="container-xs" style={{ paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
        <div className="empty-state">
          <div className="empty-state-icon">&#x1F50D;</div>
          <h3>Certificate Not Found</h3>
          <p>The certificate with ID "{id}" doesn't exist or has been removed.</p>
          <Link to="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const origin = CREATIVE_ORIGINS.find(o => o.id === cert.creativeOrigin);
  const workType = WORK_TYPES.find(t => t.id === cert.workType);

  return (
    <div className="container-xs" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '20px',
          color: 'var(--human)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          &#x2705; Verified Soulprint Certificate
        </div>
      </div>

      <div className="cert-card fade-in">
        <div className="cert-header">
          <div className="cert-logo">
            <span>&#x1F50F;</span>
            <span className="cert-logo-text">Soulprint</span>
          </div>
          <div className="cert-id">{cert.id}</div>
        </div>

        <div className="cert-title">{cert.title}</div>
        <div className="cert-creator">by {cert.creatorName}</div>

        {cert.description && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.6,
          }}>
            {cert.description}
          </p>
        )}

        <div className="cert-details">
          <div>
            <div className="cert-detail-label">Work Type</div>
            <div className="cert-detail-value">
              {workType?.icon} {workType?.label}
            </div>
          </div>
          <div>
            <div className="cert-detail-label">Creative Origin</div>
            <div className="cert-detail-value">
              <span className={`cert-origin-badge ${originClass(cert.creativeOrigin)}`}>
                {origin?.icon} {origin?.label}
              </span>
            </div>
          </div>
          <div>
            <div className="cert-detail-label">Registered</div>
            <div className="cert-detail-value">
              {new Date(cert.timestamp).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="cert-detail-label">Time</div>
            <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              {new Date(cert.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </div>
          </div>
          {cert.culturalContext && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="cert-detail-label">Cultural Context</div>
              <div className="cert-detail-value">{cert.culturalContext}</div>
            </div>
          )}
          {cert.aiToolsUsed && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="cert-detail-label">AI Tools Used</div>
              <div className="cert-detail-value">{cert.aiToolsUsed}</div>
            </div>
          )}
          {cert.humanContribution && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="cert-detail-label">Human Contribution</div>
              <div className="cert-detail-value">{cert.humanContribution}</div>
            </div>
          )}
          {cert.processNotes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="cert-detail-label">Process Notes</div>
              <div className="cert-detail-value" style={{ color: 'var(--text-secondary)' }}>
                {cert.processNotes}
              </div>
            </div>
          )}
          {cert.fileName && (
            <div>
              <div className="cert-detail-label">File</div>
              <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {cert.fileName}
              </div>
            </div>
          )}
          {cert.fileSize ? (
            <div>
              <div className="cert-detail-label">File Size</div>
              <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {(cert.fileSize / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : null}
        </div>

        {/* Hashes */}
        <div className="cert-hash">
          <span className="cert-hash-label">SHA-256 Certificate Hash</span>
          {cert.hash}
        </div>

        {cert.fileHash && (
          <div className="cert-hash" style={{ marginTop: 'var(--space-sm)' }}>
            <span className="cert-hash-label">SHA-256 File Fingerprint</span>
            {cert.fileHash}
          </div>
        )}

        <div className="cert-footer">
          <div className="cert-timestamp">
            Soulprint &mdash; Fair Trade for Creative Work
          </div>
          <div className="cert-verified">&#x2705; Verified</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => setShowBadge(!showBadge)}>
          {showBadge ? 'Hide Badge Code' : 'Get Embeddable Badge'}
        </button>
        <Link to="/dashboard" className="btn btn-ghost">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Badge Code */}
      {showBadge && (
        <div className="fade-in" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Embeddable Badge</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              Copy this HTML and paste it into your website or portfolio. The badge links back
              to this verification page.
            </p>

            {/* Preview */}
            <div style={{
              padding: 'var(--space-lg)',
              background: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-md)',
              textAlign: 'center',
            }}>
              <div
                dangerouslySetInnerHTML={{ __html: generateBadgeHTML(cert) }}
                style={{ display: 'inline-block' }}
              />
            </div>

            <div className="badge-code">{generateBadgeHTML(cert)}</div>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 'var(--space-md)' }}
              onClick={handleCopyBadge}
            >
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
