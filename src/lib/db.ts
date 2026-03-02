// Soulprint Forensic Lab — IndexedDB Storage via idb
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SoulprintReport, ImageAnalysis } from '../types/forensic';

interface SoulprintDB extends DBSchema {
  soulprints: {
    key: string;
    value: {
      id: string;
      name: string;
      createdAt: number;
      crossAnalysis: string; // JSON serialized
      soulprintIndex: string; // JSON serialized
      phashes: string[];
      imageCount: number;
    };
    indexes: { 'by-date': number };
  };
  images: {
    key: string;
    value: {
      id: string;
      soulprintId: string;
      name: string;
      blob: Blob;
      thumbnail: string;
      width: number;
      height: number;
    };
    indexes: { 'by-soulprint': string };
  };
  analyses: {
    key: string;
    value: {
      imageId: string;
      soulprintId: string;
      data: string; // JSON serialized (ImageAnalysis)
    };
    indexes: { 'by-soulprint': string };
  };
  models: {
    key: string;
    value: {
      soulprintId: string;
      blob: Blob;
      filename: string;
    };
  };
}

let dbInstance: IDBPDatabase<SoulprintDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SoulprintDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<SoulprintDB>('soulprint-forensics', 1, {
    upgrade(db) {
      const soulprints = db.createObjectStore('soulprints', { keyPath: 'id' });
      soulprints.createIndex('by-date', 'createdAt');

      const images = db.createObjectStore('images', { keyPath: 'id' });
      images.createIndex('by-soulprint', 'soulprintId');

      const analyses = db.createObjectStore('analyses', { keyPath: 'imageId' });
      analyses.createIndex('by-soulprint', 'soulprintId');

      db.createObjectStore('models', { keyPath: 'soulprintId' });
    },
  });
  return dbInstance;
}

export async function saveSoulprint(report: SoulprintReport): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['soulprints', 'images', 'analyses', 'models'], 'readwrite');

  await tx.objectStore('soulprints').put({
    id: report.id,
    name: report.name,
    createdAt: report.createdAt,
    crossAnalysis: JSON.stringify(report.crossAnalysis),
    soulprintIndex: JSON.stringify(report.soulprintIndex),
    phashes: report.phashes,
    imageCount: report.images.length,
  });

  for (const img of report.images) {
    await tx.objectStore('images').put({
      id: img.id,
      soulprintId: report.id,
      name: img.name,
      blob: img.file,
      thumbnail: img.thumbnail,
      width: img.width,
      height: img.height,
    });
  }

  for (const analysis of report.analyses) {
    await tx.objectStore('analyses').put({
      imageId: analysis.imageId,
      soulprintId: report.id,
      data: JSON.stringify(analysis, (_k, v) =>
        v instanceof Float32Array || v instanceof Uint8ClampedArray
          ? { __type: v.constructor.name, data: Array.from(v) }
          : v
      ),
    });
  }

  if (report.model3d) {
    await tx.objectStore('models').put({
      soulprintId: report.id,
      blob: report.model3d.blob,
      filename: report.model3d.filename,
    });
  }

  await tx.done;
}

function reviveTypedArrays(_k: string, v: unknown): unknown {
  if (v && typeof v === 'object' && '__type' in (v as Record<string, unknown>)) {
    const obj = v as { __type: string; data: number[] };
    if (obj.__type === 'Float32Array') return new Float32Array(obj.data);
    if (obj.__type === 'Uint8ClampedArray') return new Uint8ClampedArray(obj.data);
  }
  return v;
}

export async function loadSoulprint(id: string): Promise<SoulprintReport | null> {
  const db = await getDB();
  const sp = await db.get('soulprints', id);
  if (!sp) return null;

  const images = await db.getAllFromIndex('images', 'by-soulprint', id);
  const analysisRows = await db.getAllFromIndex('analyses', 'by-soulprint', id);
  const model = await db.get('models', id);

  const analyses: ImageAnalysis[] = analysisRows.map((r) =>
    JSON.parse(r.data, reviveTypedArrays)
  );

  return {
    id: sp.id,
    name: sp.name,
    createdAt: sp.createdAt,
    images: images.map((img) => ({
      id: img.id,
      file: new File([img.blob], img.name),
      name: img.name,
      thumbnail: img.thumbnail,
      width: img.width,
      height: img.height,
      status: 'complete' as const,
    })),
    analyses,
    crossAnalysis: JSON.parse(sp.crossAnalysis),
    soulprintIndex: JSON.parse(sp.soulprintIndex),
    phashes: sp.phashes,
    model3d: model ? { blob: model.blob, filename: model.filename } : undefined,
  };
}

export async function listSoulprints(): Promise<
  Array<{ id: string; name: string; createdAt: number; imageCount: number; phashes: string[] }>
> {
  const db = await getDB();
  const all = await db.getAllFromIndex('soulprints', 'by-date');
  return all
    .map((sp) => ({
      id: sp.id,
      name: sp.name,
      createdAt: sp.createdAt,
      imageCount: sp.imageCount,
      phashes: sp.phashes,
    }))
    .reverse();
}

export async function deleteSoulprint(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['soulprints', 'images', 'analyses', 'models'], 'readwrite');
  await tx.objectStore('soulprints').delete(id);
  const images = await tx.objectStore('images').index('by-soulprint').getAllKeys(id);
  for (const key of images) await tx.objectStore('images').delete(key);
  const analyses = await tx.objectStore('analyses').index('by-soulprint').getAllKeys(id);
  for (const key of analyses) await tx.objectStore('analyses').delete(key);
  await tx.objectStore('models').delete(id);
  await tx.done;
}

export async function getAllPhashes(): Promise<Array<{ soulprintId: string; name: string; phashes: string[] }>> {
  const db = await getDB();
  const all = await db.getAll('soulprints');
  return all.map((sp) => ({ soulprintId: sp.id, name: sp.name, phashes: sp.phashes }));
}
