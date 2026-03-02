import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreativeOrigin, WorkType } from '../types';
import { CREATIVE_ORIGINS, WORK_TYPES } from '../types';
import { hashFile } from '../lib/crypto';
import { createCertificate } from '../lib/certificates';

type Step = 1 | 2 | 3 | 4;

export function Register() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<WorkType | ''>('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creativeOrigin, setCreativeOrigin] = useState<CreativeOrigin | null>(null);
  const [culturalContext, setCulturalContext] = useState('');
  const [aiToolsUsed, setAiToolsUsed] = useState('');
  const [humanContribution, setHumanContribution] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileHash, setFileHash] = useState('');
  const [hashing, setHashing] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setHashing(true);
    try {
      const hash = await hashFile(file);
      setFileHash(hash);
    } catch {
      setFileHash('');
    }
    setHashing(false);
  }, []);

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1: return !!(title && workType && creatorName);
      case 2: return !!creativeOrigin;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    if (!creativeOrigin || !workType) return;
    setGenerating(true);
    try {
      const cert = await createCertificate({
        title,
        description,
        workType: workType as WorkType,
        creativeOrigin,
        creatorName,
        creatorEmail,
        culturalContext,
        aiToolsUsed,
        humanContribution,
        fileHash: fileHash || undefined,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        processNotes,
      });
      navigate(`/certificate/${cert.id}`);
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const originClass = (id: CreativeOrigin): string => {
    const map: Record<CreativeOrigin, string> = {
      'fully-human': 'human',
      'human-directed': 'directed',
      'collaboration': 'collab',
      'ai-generated': 'ai',
    };
    return map[id];
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="container-sm" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>Register Your Work</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Create a verifiable provenance certificate in under 3 minutes.</p>
      </div>

      {/* Step Indicator */}
      <div className="steps">
        {[1, 2, 3, 4].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
              <div className="step-number">{step > s ? '\u2713' : s}</div>
              <span className="step-label">
                {['Details', 'Origin', 'Evidence', 'Review'][i]}
              </span>
            </div>
            {s < 4 && <div className={`step-line ${step > s ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Work Details */}
      {step === 1 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Work Details</h2>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Name of your work"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type *</label>
            <select
              className="form-select"
              value={workType}
              onChange={e => setWorkType(e.target.value as WorkType)}
            >
              <option value="">Select work type...</option>
              {WORK_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your work, its meaning, and creative process..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Creator name"
                value={creatorName}
                onChange={e => setCreatorName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={creatorEmail}
                onChange={e => setCreatorEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cultural Context (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Ndebele textile tradition, Cape Jazz, South African street art..."
              value={culturalContext}
              onChange={e => setCulturalContext(e.target.value)}
            />
            <p className="form-hint">If this work belongs to or draws from a cultural tradition, describe it here.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button
              className="btn btn-primary"
              disabled={!canProceed(1)}
              onClick={() => setStep(2)}
              style={{ opacity: canProceed(1) ? 1 : 0.5 }}
            >
              Next: Creative Origin &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Creative Origin */}
      {step === 2 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>Creative Origin</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
            How was this work created? Be honest &mdash; Soulprint is about transparency, not policing.
          </p>

          <div className="origin-grid">
            {CREATIVE_ORIGINS.map(origin => (
              <div
                key={origin.id}
                className={`origin-option ${originClass(origin.id)} ${creativeOrigin === origin.id ? 'selected' : ''}`}
                onClick={() => setCreativeOrigin(origin.id)}
              >
                <div className="origin-icon">{origin.icon}</div>
                <div className="origin-label">{origin.label}</div>
                <div className="origin-pct" style={{ color: origin.color }}>{origin.percentage}</div>
                <div className="origin-desc">{origin.description}</div>
              </div>
            ))}
          </div>

          {/* Conditional fields based on origin */}
          {creativeOrigin && creativeOrigin !== 'fully-human' && (
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <div className="form-group">
                <label className="form-label">AI Tools Used</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Midjourney v6, ChatGPT-4, Stable Diffusion XL..."
                  value={aiToolsUsed}
                  onChange={e => setAiToolsUsed(e.target.value)}
                />
              </div>
              {(creativeOrigin === 'human-directed' || creativeOrigin === 'collaboration') && (
                <div className="form-group">
                  <label className="form-label">Your Human Contribution</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe what you personally created, directed, curated, or designed..."
                    value={humanContribution}
                    onChange={e => setHumanContribution(e.target.value)}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>&larr; Back</button>
            <button
              className="btn btn-primary"
              disabled={!canProceed(2)}
              onClick={() => setStep(3)}
              style={{ opacity: canProceed(2) ? 1 : 0.5 }}
            >
              Next: Evidence &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Evidence */}
      {step === 3 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>Evidence & File</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
            Upload your work for cryptographic fingerprinting. The file never leaves your device &mdash;
            only the SHA-256 hash is stored.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div
            className={`file-upload ${fileName ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {hashing ? (
              <>
                <div className="file-upload-icon">&#x23F3;</div>
                <p>Generating cryptographic hash...</p>
              </>
            ) : fileName ? (
              <>
                <div className="file-upload-icon">&#x2705;</div>
                <p><strong>{fileName}</strong></p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatBytes(fileSize)}</p>
                {fileHash && (
                  <p className="file-name" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    SHA-256: {fileHash.substring(0, 16)}...{fileHash.substring(48)}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="file-upload-icon">&#x1F4C1;</div>
                <p>Click to upload your work</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Images, audio, video, documents, or any file type
                </p>
              </>
            )}
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-xl)' }}>
            <label className="form-label">Process Notes (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your creative process, tools used, iterations, or any other evidence of authorship..."
              value={processNotes}
              onChange={e => setProcessNotes(e.target.value)}
            />
            <p className="form-hint">
              Screenshots of work-in-progress, DAW session files, sketches, or any evidence
              that supports your creative origin claim.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>&larr; Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>
              Next: Review &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xl)' }}>Review & Generate</h2>

          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Title</span>
              <span style={{ fontWeight: 600 }}>{title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Type</span>
              <span>{WORK_TYPES.find(t => t.id === workType)?.label || workType}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Creator</span>
              <span>{creatorName}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Origin</span>
              <span className={`cert-origin-badge ${creativeOrigin ? originClass(creativeOrigin) : ''}`}>
                {CREATIVE_ORIGINS.find(o => o.id === creativeOrigin)?.icon}{' '}
                {CREATIVE_ORIGINS.find(o => o.id === creativeOrigin)?.label}
              </span>
            </div>
            {description && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Description</span>
                <span style={{ color: 'var(--text-secondary)' }}>{description}</span>
              </div>
            )}
            {culturalContext && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Culture</span>
                <span style={{ color: 'var(--text-secondary)' }}>{culturalContext}</span>
              </div>
            )}
            {aiToolsUsed && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI Tools</span>
                <span style={{ color: 'var(--text-secondary)' }}>{aiToolsUsed}</span>
              </div>
            )}
            {fileName && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>File</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {fileName} ({formatBytes(fileSize)})
                </span>
              </div>
            )}
            {fileHash && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-sm)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>File Hash</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text-muted)' }}>
                  {fileHash}
                </span>
              </div>
            )}
          </div>

          <div style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-md)',
            background: 'rgba(212, 168, 71, 0.05)',
            border: '1px solid rgba(212, 168, 71, 0.15)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            By generating this certificate, you declare that the creative origin information
            provided above is truthful and accurate to the best of your knowledge.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>&larr; Back</button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating Certificate...' : 'Generate Soulprint Certificate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
