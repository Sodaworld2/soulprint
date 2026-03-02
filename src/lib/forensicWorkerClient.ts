// Comlink wrapper for the forensic web worker
import * as Comlink from 'comlink';
import type { ForensicWorkerAPI } from '../workers/forensicWorker';

let workerInstance: Worker | null = null;
let apiProxy: Comlink.Remote<ForensicWorkerAPI> | null = null;

export function getForensicWorker(): Comlink.Remote<ForensicWorkerAPI> {
  if (apiProxy) return apiProxy;

  workerInstance = new Worker(
    new URL('../workers/forensicWorker.ts', import.meta.url),
    { type: 'module' }
  );

  apiProxy = Comlink.wrap<ForensicWorkerAPI>(workerInstance);
  return apiProxy;
}

export function terminateWorker(): void {
  workerInstance?.terminate();
  workerInstance = null;
  apiProxy = null;
}
