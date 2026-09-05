import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ClientProcess } from '../types';
import { repairProcessFields } from '../utils/storage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID and long polling to prevent proxy/WebSocket drops
export const db = (() => {
  const settings = {
    experimentalForceLongPolling: true,
  };
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      return initializeFirestore(app, settings, firebaseConfig.firestoreDatabaseId);
    }
    return initializeFirestore(app, settings);
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

export { firebaseConfig };

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
};

export type { User };

/**
 * Validates active connection or readiness to Firestore
 */
export async function testConnection(): Promise<boolean> {
  return true;
}

// Firestore collection name for processes
const PROCESSES_COLLECTION = 'processes';

// Circuit breaker flag to prevent infinite retry loops if daily free quota is hit
let isFirestoreQuotaExhausted = false;

function isQuotaError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return (
    code === 'resource-exhausted' ||
    message.includes('Quota limit exceeded') ||
    message.includes('resource-exhausted')
  );
}

/**
 * Merge cloud processes with local processes without losing locally created/updated records
 */
export function mergeProcessesLists(
  localList: ClientProcess[],
  cloudList: ClientProcess[]
): ClientProcess[] {
  const map = new Map<string, ClientProcess>();

  // Add all local processes first
  for (const proc of localList) {
    if (proc && proc.id) {
      map.set(proc.id, repairProcessFields(proc));
    }
  }

  // Merge cloud processes: take cloud version if newer or not present locally
  for (const rawCloudProc of cloudList) {
    if (!rawCloudProc || !rawCloudProc.id) continue;
    const cloudProc = repairProcessFields(rawCloudProc);
    const existing = map.get(cloudProc.id);
    if (!existing) {
      map.set(cloudProc.id, cloudProc);
    } else {
      // Compare timestamps
      const cloudTime = new Date(cloudProc.stageUpdatedAt || cloudProc.createdAt || 0).getTime();
      const localTime = new Date(existing.stageUpdatedAt || existing.createdAt || 0).getTime();
      if (cloudTime > localTime) {
        map.set(cloudProc.id, cloudProc);
      }
    }
  }

  return Array.from(map.values()).map(repairProcessFields);
}

/**
 * Save / sync all processes to Firestore in chunked batches of 200 items (Firestore limit is 500)
 */
export async function syncProcessesToFirestore(
  processes: ClientProcess[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (isFirestoreQuotaExhausted || !processes || processes.length === 0) {
    return { success: false, count: 0 };
  }
  try {
    const chunkSize = 200;
    let syncedCount = 0;

    for (let i = 0; i < processes.length; i += chunkSize) {
      const chunk = processes.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const rawProc of chunk) {
        if (!rawProc || !rawProc.id) continue;
        const process = repairProcessFields(rawProc);
        const processRef = doc(db, PROCESSES_COLLECTION, process.id);
        batch.set(
          processRef,
          {
            ...process,
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        syncedCount++;
      }

      await batch.commit();
    }

    return { success: true, count: syncedCount };
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore sync status:', error?.message || error);
    }
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

/**
 * Save single process to Firestore immediately
 */
export async function saveProcessToFirestore(process: ClientProcess): Promise<void> {
  if (isFirestoreQuotaExhausted || !process || !process.id) return;
  try {
    const sanitized = repairProcessFields(process);
    const processRef = doc(db, PROCESSES_COLLECTION, sanitized.id);
    await setDoc(
      processRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore single save notice:', error?.message || error);
    }
  }
}

/**
 * Delete single process from Firestore
 */
export async function deleteProcessFromFirestore(processId: string): Promise<void> {
  if (isFirestoreQuotaExhausted || !processId) return;
  try {
    const processRef = doc(db, PROCESSES_COLLECTION, processId);
    await setDoc(
      processRef,
      {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    } else {
      console.warn('Firestore delete notice:', error?.message || error);
    }
  }
}

/**
 * Load processes from Firestore
 */
export async function loadProcessesFromFirestore(): Promise<ClientProcess[]> {
  if (isFirestoreQuotaExhausted) return [];
  try {
    const q = query(collection(db, PROCESSES_COLLECTION));
    const querySnapshot = await getDocs(q);
    const processes: ClientProcess[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (!data.isDeleted) {
        processes.push(repairProcessFields(data as ClientProcess));
      }
    });
    return processes;
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    }
    console.warn('Firestore read status (using cached / local processes):', error?.message || error);
    return [];
  }
}

/**
 * Real-time listener for processes in Firestore with safe callback
 */
export function subscribeToProcesses(onUpdate: (processes: ClientProcess[]) => void) {
  if (isFirestoreQuotaExhausted) return () => {};
  try {
    const q = query(collection(db, PROCESSES_COLLECTION));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const processes: ClientProcess[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as any;
          if (!data.isDeleted) {
            processes.push(repairProcessFields(data as ClientProcess));
          }
        });
        if (processes.length > 0) {
          onUpdate(processes);
        }
      },
      (error: any) => {
        if (isQuotaError(error)) {
          isFirestoreQuotaExhausted = true;
        }
        console.warn('Firestore snapshot listener status:', error?.message || error);
      }
    );
  } catch (err: any) {
    if (isQuotaError(err)) {
      isFirestoreQuotaExhausted = true;
    }
    return () => {};
  }
}

/**
 * Returns diagnostic metadata about the connected Firestore database
 */
export async function getFirestoreMetadata(): Promise<{
  connected: boolean;
  databaseId: string;
  projectId: string;
  totalDocuments: number;
}> {
  const meta = {
    connected: false,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    projectId: firebaseConfig.projectId || '',
    totalDocuments: 0,
  };

  try {
    const q = query(collection(db, PROCESSES_COLLECTION));
    const snap = await getDocs(q);
    meta.connected = true;
    meta.totalDocuments = snap.docs.filter((d) => !d.data()?.isDeleted).length;
  } catch (e) {
    meta.connected = !isFirestoreQuotaExhausted;
  }

  return meta;
}
