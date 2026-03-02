import type { Certificate } from '../types';

const STORAGE_KEY = 'soulprint_certificates';

export function loadCertificates(): Certificate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCertificates(certs: Certificate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

export function clearCertificates(): void {
  localStorage.removeItem(STORAGE_KEY);
}
