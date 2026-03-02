import type { Certificate, CreativeOrigin, WorkType } from '../types';
import { sha256, generateCertId } from './crypto';
import { loadCertificates, saveCertificates } from './storage';

export interface CertificateInput {
  title: string;
  description: string;
  workType: WorkType;
  creativeOrigin: CreativeOrigin;
  creatorName: string;
  creatorEmail?: string;
  culturalContext?: string;
  aiToolsUsed?: string;
  humanContribution?: string;
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  processNotes?: string;
}

export async function createCertificate(input: CertificateInput): Promise<Certificate> {
  const id = generateCertId();
  const timestamp = new Date().toISOString();

  const hashPayload = JSON.stringify({
    id,
    title: input.title,
    description: input.description,
    workType: input.workType,
    creativeOrigin: input.creativeOrigin,
    creatorName: input.creatorName,
    fileHash: input.fileHash || 'no-file',
    timestamp,
  });

  const hash = await sha256(hashPayload);

  const cert: Certificate = {
    id,
    title: input.title,
    description: input.description,
    workType: input.workType,
    creativeOrigin: input.creativeOrigin,
    creatorName: input.creatorName,
    creatorEmail: input.creatorEmail,
    culturalContext: input.culturalContext,
    aiToolsUsed: input.aiToolsUsed,
    humanContribution: input.humanContribution,
    fileHash: input.fileHash,
    fileName: input.fileName,
    fileSize: input.fileSize,
    processNotes: input.processNotes,
    hash,
    timestamp,
    createdAt: timestamp,
    verified: true,
    views: 0,
  };

  const existing = loadCertificates();
  existing.push(cert);
  saveCertificates(existing);

  return cert;
}

export function getCertificate(id: string): Certificate | undefined {
  const certs = loadCertificates();
  return certs.find(c => c.id === id);
}

export function getAllCertificates(): Certificate[] {
  return loadCertificates();
}

export function deleteCertificate(id: string): void {
  const certs = loadCertificates();
  const filtered = certs.filter(c => c.id !== id);
  saveCertificates(filtered);
}

export function generateBadgeHTML(cert: Certificate): string {
  const originColors: Record<CreativeOrigin, string> = {
    'fully-human': '#22c55e',
    'human-directed': '#d4a847',
    'collaboration': '#a855f7',
    'ai-generated': '#ec4899',
  };
  const originLabels: Record<CreativeOrigin, string> = {
    'fully-human': '100% Human',
    'human-directed': 'Human-Directed',
    'collaboration': 'Human-AI Collab',
    'ai-generated': 'AI-Generated',
  };
  const color = originColors[cert.creativeOrigin];
  const label = originLabels[cert.creativeOrigin];

  return `<!-- Soulprint Badge -->
<a href="${window.location.origin}/verify?id=${cert.id}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:#0d0d14;border:1px solid ${color};border-radius:8px;font-family:'Space Grotesk',sans-serif;text-decoration:none;color:#e8e8ed;font-size:13px;">
  <span style="font-size:16px;">🔏</span>
  <span>Soulprint Certified</span>
  <span style="color:${color};font-weight:600;">${label}</span>
  <span style="color:#8888a0;font-family:'JetBrains Mono',monospace;font-size:11px;">${cert.id}</span>
</a>`;
}
