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

// Initialize Firestore with custom database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
};

export type { User };

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
 * Save / sync all processes to Firestore
 */
export async function syncProcessesToFirestore(processes: ClientProcess[]): Promise<void> {
  if (isFirestoreQuotaExhausted || !processes || processes.length === 0) return;
  try {
    const batch = writeBatch(db);
    processes.forEach((process) => {
      if (!process.id) return;
      const processRef = doc(db, PROCESSES_COLLECTION, process.id);
      batch.set(
        processRef,
        {
          ...process,
          syncedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore sync notice (local backup active):', error);
    }
  }
}

/**
 * Save single process to Firestore immediately
 */
export async function saveProcessToFirestore(process: ClientProcess): Promise<void> {
  if (isFirestoreQuotaExhausted || !process || !process.id) return;
  try {
    const processRef = doc(db, PROCESSES_COLLECTION, process.id);
    await setDoc(
      processRef,
      {
        ...process,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore single save notice:', error);
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
      console.warn('Firestore delete notice:', error);
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
        processes.push(data as ClientProcess);
      }
    });
    return processes;
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    }
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
            processes.push(data as ClientProcess);
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
      }
    );
  } catch (err: any) {
    if (isQuotaError(err)) {
      isFirestoreQuotaExhausted = true;
    }
    return () => {};
  }
}
